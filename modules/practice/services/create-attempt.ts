import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { Attempt } from "../domain/practice";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

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

  log.info({ 
    event: "practice.attempt", 
    meta: { type: "domain", userId, phase: "start", sessionId, problemId } 
  });

  try {
    const attempt = await repo.createAttempt(sessionId, problemId, userId);

    log.info({ 
      event: "practice.attempt", 
      meta: { type: "domain", userId, phase: "complete", attemptId: attempt.id, outcome: "success" } 
    });
    return attempt;
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
        error: err instanceof Error ? err.message : String(err) 
      }
    });
    throw err;
  }
}
