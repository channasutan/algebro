export type JobPayload = Record<string, unknown>;

export type Job = {
  id: string;
  type: string;
  payload: JobPayload;
  attempt: number;
  maxAttempts: number;
};

export type JobHandler = (job: Job) => Promise<void>;

const jobHandlers = new Map<string, JobHandler>();

export function registerJobHandler(jobType: string, handler: JobHandler): void {
  jobHandlers.set(jobType, handler);
}

export async function runJob(job: Job): Promise<void> {
  const handler = jobHandlers.get(job.type);

  if (!handler) {
    throw new Error(`No job handler registered for type: ${job.type}`);
  }

  await handler(job);
}
