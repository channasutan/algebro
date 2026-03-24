import type { ProblemRepository } from "../repositories/problem-repository";
import type { ProblemPoolEntry } from "../domain/problem-pool-entry";
import { generateProblem } from "./generate-problem";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

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
    batchSize?: number;
  },
  context: ServiceContext
): Promise<{ generated: number; failed: number }> {
  const log = createServiceLogger(context.requestId);
  const { templateId, topicId, difficulty, count } = options;

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
    },
  });

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < count; i++) {
    try {
      const result = await generateProblem(
        repo,
        {
          templateId,
          topicId,
          difficultyLevel: difficulty,
        },
        context
      );

      if (result.wasValidated && result.problem) {
        // Add to pool
        const poolEntry: ProblemPoolEntry = {
          id: "", // Will be assigned by database
          problemId: result.problem.id,
          topicId,
          createdAt: "", // Will be assigned by database
        };

        await repo.addToPool(poolEntry);
        generated++;

        // Log progress every 10 items
        if ((i + 1) % 10 === 0) {
          log.info({
            event: "practice.populate-pool",
            meta: {
              type: "domain",
              phase: "complete",
              userId: "system",
              progress: `${i + 1}/${count}`,
              generated,
              failed,
            },
          });
        }
      } else {
        failed++;
        log.warn({
          event: "practice.populate-pool",
          meta: {
            type: "domain",
            phase: "validation",
            userId: "system",
            outcome: "failure",
            reason: result.errorType,
            index: i,
          },
        });
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      log.error({
        event: "practice.populate-pool",
        meta: {
          type: "domain",
          phase: "infra",
          userId: "system",
          outcome: "failure",
          error: errorMessage,
          index: i,
        },
      });

      // Continue to next iteration - don't stop batch
    }
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
