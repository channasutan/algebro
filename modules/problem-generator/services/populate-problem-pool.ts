import type { ProblemRepository } from "../repositories/problem-repository";
import type { ProblemPoolEntry } from "../domain/problem-pool-entry";
import { generateProblem } from "./generate-problem";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

async function generateAndAddToPool(
  repo: ProblemRepository,
  params: {
    templateId: string;
    topicId: string;
    difficulty: number;
  },
  context: ServiceContext,
  log: ReturnType<typeof createServiceLogger>
): Promise<"generated" | "failed"> {
  const result = await generateProblem(
    repo,
    {
      templateId: params.templateId,
      topicId: params.topicId,
      difficultyLevel: params.difficulty,
    },
    context
  );

  if (result.wasValidated && result.problem) {
    const poolEntry: ProblemPoolEntry = {
      id: "",
      problemId: result.problem.id,
      topicId: params.topicId,
      createdAt: "",
    };
    await repo.addToPool(poolEntry);
    return "generated";
  }

  log.warn({
    event: "practice.populate-pool",
    meta: {
      type: "domain",
      phase: "validation",
      userId: "system",
      outcome: "failure",
      reason: result.errorType,
    },
  });
  return "failed";
}

function countBatchResults(
  results: PromiseSettledResult<"generated" | "failed">[],
  log: ReturnType<typeof createServiceLogger>
): { generated: number; failed: number } {
  let generated = 0;
  let failed = 0;

  for (const settled of results) {
    if (settled.status === "fulfilled" && settled.value === "generated") {
      generated++;
    } else {
      if (settled.status === "rejected") {
        const errorMessage =
          settled.reason instanceof Error
            ? settled.reason.message
            : String(settled.reason);
        log.error({
          event: "practice.populate-pool",
          meta: {
            type: "domain",
            phase: "infra",
            userId: "system",
            outcome: "failure",
            error: errorMessage,
          },
        });
      }
      failed++;
    }
  }

  return { generated, failed };
}

/**
 * Batch generates problems and populates the problem pool.
 * Continues on individual failures to maximize yield.
 *
 * @param repo - Problem repository for persistence
 * @param options - Batch generation options
 * @param context - Service context for logging
 * @returns Counts of generated and failed problems
 */
export async function populatePool(
  repo: ProblemRepository,
  options: {
    templateId: string;
    topicId: string;
    difficulty: number;
    count: number;
    /**
     * Number of problems to generate concurrently per batch.
     * Defaults to 1 (fully sequential) to avoid DB connection pool exhaustion.
     * Increase only when targeting a Supabase pooler with pgBouncer enabled.
     * Reference: https://supabase.com/docs/guides/database/connection-pooling
     */
    batchSize?: number;
  },
  context: ServiceContext
): Promise<{ generated: number; failed: number }> {
  const log = createServiceLogger(context.requestId);
  const { templateId, topicId, difficulty, count, batchSize = 1 } = options;

  log.info({
    event: "practice.populate-pool",
    meta: {
      type: "domain",
      phase: "start",
      userId: "system",
      templateId,
      topicId,
      difficulty,
      requestedCount: count,
      batchSize,
    },
  });

  let generated = 0;
  let failed = 0;

  // Process in batches to allow concurrency control
  const indices = Array.from({ length: count }, (_, i) => i);
  const batches: number[][] = [];
  for (let i = 0; i < indices.length; i += batchSize) {
    batches.push(indices.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(() =>
        generateAndAddToPool(
          repo,
          { templateId, topicId, difficulty },
          context,
          log
        )
      )
    );

    const counts = countBatchResults(results, log);
    generated += counts.generated;
    failed += counts.failed;

    log.info({
      event: "practice.populate-pool",
      meta: {
        type: "domain",
        phase: "progress",
        userId: "system",
        progress: `${generated + failed}/${count}`,
        generated,
        failed,
      },
    });
  }

  log.info({
    event: "practice.populate-pool",
    meta: {
      type: "domain",
      phase: "complete",
      userId: "system",
      outcome: "success",
      generated,
      failed,
      total: count,
    },
  });

  return { generated, failed };
}
