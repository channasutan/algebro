import { z } from "zod";

import {
  JobHandler,
  NonRetryableJobError
} from "@/jobs/job-runner";
import { populatePool } from "@/modules/problem-generator";
import { createSupabaseProblemRepository } from "@/modules/problem-generator/repositories/supabase-problem-repository";

export const POPULATE_POOL_JOB = "populate_pool" as const;

export const populatePoolPayloadSchema = z.object({
  templateId: z.string(),
  topicId: z.string(),
  difficulty: z.number().int().min(1).max(10),
  count: z.number().int().min(1).max(100),
  batchSize: z.number().int().min(1).max(10).optional()
});

export type PopulatePoolPayload = z.infer<typeof populatePoolPayloadSchema>;

export const populatePoolHandler: JobHandler = async (job) => {
  const payload = populatePoolPayloadSchema.parse(job.payload);
  const repo = await createSupabaseProblemRepository();
  const context = { requestId: job.id };

  const result = await populatePool(
    repo,
    {
      templateId: payload.templateId,
      topicId: payload.topicId,
      difficulty: payload.difficulty,
      count: payload.count,
      batchSize: payload.batchSize
    },
    context
  );

  if (result.generated === 0) {
    throw new NonRetryableJobError(
      `populatePool generated 0 problems for templateId=${payload.templateId}`
    );
  }
}
