import { z } from "zod";

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

export type JobDefinition = {
  handler: JobHandler;
  schema?: z.ZodSchema;
};

export type JobRunResult = {
  jobId: string;
  status: "completed" | "retryable_failure" | "terminal_failure";
  attemptCount: number;
  errorMessage?: string;
};

/**
 * Error type that signals a permanent job failure.
 *
 * Job handlers should throw this when they determine that the job
 * cannot succeed on any subsequent attempt.
 *
 * When runJob catches this error it will:
 * - return JobRunResult.status = "terminal_failure"
 * - prevent further retries for the job.
 */
export class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableJobError";

    Object.setPrototypeOf(this, new.target.prototype);

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
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

const jobHandlers = new Map<string, JobDefinition>();

export function registerJobHandler(
  jobType: string,
  handlerOrDefinition: JobHandler | JobDefinition
): void {
  if (typeof handlerOrDefinition === "function") {
    jobHandlers.set(jobType, { handler: handlerOrDefinition });
  } else {
    jobHandlers.set(jobType, handlerOrDefinition);
  }
}

export function clearJobHandlers(): void {
  jobHandlers.clear();
}

export function canRetryJob(job: Job): boolean {
  return job.attemptCount + 1 < job.maxAttempts;
}

export async function runJob(job: Job): Promise<JobRunResult> {
  const definition = jobHandlers.get(job.type);

  if (!definition) {
    throw new Error(`No job handler registered for type: ${job.type}`);
  }

  const { handler, schema } = definition;

  try {
    // Optional runtime payload validation
    if (schema) {
      try {
        schema.parse(job.payload);
      } catch (validationError) {
        throw new NonRetryableJobError(
          `Invalid payload for job "${job.type}": ${validationError}`
        );
      }
    }

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
