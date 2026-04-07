import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { Attempt, SolutionStep } from "../domain/practice";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

export type CreateAttemptInput = {
  sessionId: string;
  problemId: string;
  userId: string;
  /** The index of the first solution step (typically 0). Optional — if omitted, no step is created. */
  stepIndex?: number;
  /** The LaTeX string of the first solution step. Optional — if omitted or empty, no step is created. */
  stepLatex?: string;
};

export type CreateAttemptResult = {
  attempt: Attempt;
  step?: SolutionStep;
};

export async function createAttempt(
  input: CreateAttemptInput,
  context: ServiceContext
): Promise<CreateAttemptResult> {
  const repo = createSupabasePracticeRepository();
  return createAttemptWithRepository(repo, input, context);
}

/**
 * Creates a new practice attempt and its first solution step atomically.
 * Both inserts execute inside a single Postgres transaction via RPC.
 * If the step insert fails, the attempt row is rolled back — no orphans.
 */
export async function createAttemptWithRepository(
  repo: PracticeRepository,
  input: CreateAttemptInput,
  context: ServiceContext
): Promise<CreateAttemptResult> {
  const { sessionId, problemId, userId, stepIndex, stepLatex } = input;
  const { requestId } = context;
  const log = createServiceLogger(requestId);

  log.info({
    event: "practice.attempt",
    meta: { type: "domain", userId, phase: "start", sessionId, problemId },
  });

  const hasStep = stepLatex !== undefined && stepLatex !== "";

  try {
    if (hasStep) {
      // Atomic attempt + step creation via RPC
      const result = await repo.createAttemptWithStep(
        sessionId,
        problemId,
        userId,
        stepIndex ?? 0,
        stepLatex
      );

      log.info({
        event: "practice.attempt",
        meta: {
          type: "domain",
          userId,
          phase: "complete",
          attemptId: result.attempt.id,
          stepId: result.step.id,
          outcome: "success",
        },
      });
      return result;
    } else {
      // Attempt only (no step) — first step will be added via submitStep
      const attempt = await repo.createAttempt(sessionId, problemId, userId);

      log.info({
        event: "practice.attempt",
        meta: {
          type: "domain",
          userId,
          phase: "complete",
          attemptId: attempt.id,
          outcome: "success",
        },
      });
      return { attempt };
    }
  } catch (err) {
    log.error({
      event: "practice.attempt",
      meta: {
        type: "domain",
        userId,
        phase: "infra",
        outcome: "failure",
        sessionId,
        problemId,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
