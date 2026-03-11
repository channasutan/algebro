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
  status: "completed" | "retryable_failure" | "failed";
  attemptCount: number;
  errorMessage?: string;
};

export const JOB_QUEUE_CLAIM_SQL = `
select id, type, payload, status, attempt_count, max_attempts, scheduled_at
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

    return {
      jobId: job.id,
      status: canRetryJob(job) ? "retryable_failure" : "failed",
      attemptCount: job.attemptCount + 1,
      errorMessage
    };
  }
}
