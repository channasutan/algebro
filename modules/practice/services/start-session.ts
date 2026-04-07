import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { PracticeSession } from "../domain/practice";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

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

  log.info({
    event: "practice.session",
    meta: { type: "domain", userId, phase: "start", topicId }
  });

  const existing = await repo.findActiveSession(userId, topicId);
  if (existing) {
    log.info({
      event: "practice.session",
      meta: {
        type: "domain",
        userId,
        phase: "complete",
        sessionId: existing.id,
        outcome: "success",
      },
    });
    return existing;
  }

  try {
    const session = await repo.createSession(userId, topicId);

    log.info({ 
      event: "practice.session", 
      meta: { type: "domain", userId, phase: "complete", sessionId: session.id, outcome: "success" } 
    });
    return session;
  } catch (err) {
    log.error({ 
      event: "practice.session", 
      meta: { 
        type: "domain",
        userId, 
        phase: "infra",
        outcome: "failure",
        error: err instanceof Error ? err.message : String(err) 
      }
    });
    throw err;
  }
}
