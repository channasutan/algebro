export type JobPayload = Record<string, unknown>;

export type JobStatus = "pending" | "running" | "completed" | "failed";

export type Job = {
  id: string;
  type: string;
  payload: JobPayload;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  scheduledAt?: string | null;
};

export type JobHandler = (job: Job) => Promise<void>;

export type JobRunResult = {
  jobId: string;
  status: "completed" | "retryable_failure" | "terminal_failure";
  attemptCount: number;
  errorMessage?: string;
};

export class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableJobError";

    // Restore the prototype chain for proper instanceof behavior
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, NonRetryableJobError);
    }
  }
}

export const JOB_QUEUE_CLAIM_SQL = `
select id, type, payload, status, 
       attempt_count as "attemptCount", 
       max_attempts as "maxAttempts", 
       scheduled_at as "scheduledAt"
from public.jobs
where status = 'pending'
  and (scheduled_at is null or scheduled_at <= timezone('utc', now()))
order by created_at
limit $1
for update skip locked
`.trim();

const jobHandlers = new Map<string, JobHandler>();

export function registerJobHandler(jobType: string, handler: JobHandler): void {
  jobHandlers.set(jobType, handler);
}

export function clearJobHandlers(): void {
  jobHandlers.clear();
}

export function canRetryJob(job: Job): boolean {
  return job.attemptCount + 1 < job.maxAttempts;
}

export async function runJob(job: Job): Promise<JobRunResult> {
  const handler = jobHandlers.get(job.type);

  if (!handler) {
    throw new Error(`No job handler registered for type: ${job.type}`);
  }

  try {
    await handler({ ...job, status: "running" });

    return {
      jobId: job.id,
      status: "completed",
      attemptCount: job.attemptCount + 1
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown job execution error";

    let status: JobRunResult["status"];
    if (error instanceof NonRetryableJobError) {
      status = "terminal_failure";
    } else {
      status = canRetryJob(job) ? "retryable_failure" : "terminal_failure";
    }

    return {
      jobId: job.id,
      status,
      attemptCount: job.attemptCount + 1,
      errorMessage
    };
  }
}
