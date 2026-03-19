import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { PracticeSession } from "../domain/practice";
import { logger, createServiceLogger, type ServiceContext } from "@/lib/observability";

export type StartSessionInput = {
  userId: string;
  topicId: string | null;
};

export async function startSession(
  input: StartSessionInput,
  context: ServiceContext
): Promise<PracticeSession> {
  const repo = createSupabasePracticeRepository();
  return startSessionWithRepository(repo, input, context);
}

/**
 * Starts a new practice session for a user.
 */
export async function startSessionWithRepository(
  repo: PracticeRepository,
  input: StartSessionInput,
  context: ServiceContext
): Promise<PracticeSession> {
  const { userId, topicId } = input;
  const { requestId } = context;
  const log = createServiceLogger(requestId);

  log.info("practice.session.start", { type: "domain", userId, phase: "insert", topicId });

  try {
    const session = await repo.createSession(userId, topicId);

    log.info("practice.session.success", { type: "domain", userId, phase: "insert", sessionId: session.id, outcome: "success" });
    return session;
  } catch (err) {
    log.error("practice.session.error", { 
      type: "domain",
      userId, 
      phase: "insert",
      outcome: "failure",
      error: err instanceof Error ? err.message : String(err) 
    });
    throw err;
  }
}
