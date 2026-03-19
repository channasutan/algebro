import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { Attempt } from "../domain/practice";
import { logger, createServiceLogger, type ServiceContext } from "@/lib/observability";

export type CreateAttemptInput = {
  sessionId: string;
  problemId: string;
  userId: string;
};

export async function createAttempt(
  input: CreateAttemptInput,
  context: ServiceContext
): Promise<Attempt> {
  const repo = createSupabasePracticeRepository();
  return createAttemptWithRepository(repo, input, context);
}

/**
 * Creates a new practice attempt for a specific problem within a session.
 */
export async function createAttemptWithRepository(
  repo: PracticeRepository,
  input: CreateAttemptInput,
  context: ServiceContext
): Promise<Attempt> {
  const { sessionId, problemId, userId } = input;
  const { requestId } = context;
  const log = createServiceLogger(requestId);

  log.info("practice.attempt.create", { type: "domain", userId, phase: "insert", sessionId, problemId });

  try {
    const attempt = await repo.createAttempt(sessionId, problemId, userId);

    log.info("practice.attempt.success", { type: "domain", userId, phase: "insert", attemptId: attempt.id, outcome: "success" });
    return attempt;
  } catch (err) {
    log.error("practice.attempt.error", { 
      type: "domain",
      userId,
      phase: "insert",
      outcome: "failure",
      sessionId, 
      problemId,
      error: err instanceof Error ? err.message : String(err) 
    });
    throw err;
  }
}
