import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { PracticeSession } from "../domain/practice";
import { DuplicateActiveSessionError } from "../errors";
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
 * Checks if error is a PostgreSQL unique constraint violation (code 23505).
 * Handles wrapped errors by traversing the full cause chain.
 */
function isUniqueConstraintViolation(err: unknown): boolean {
  const targetCode = "23505";
  const visited = new Set<unknown>();
  let current: unknown = err;

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);

    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (candidate.code === targetCode) {
      return true;
    }

    if (typeof candidate.message === "string" && candidate.message.includes(targetCode)) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}

/**
 * Recovers from race condition by finding the existing session that was created
 * by another concurrent request.
 */
async function recoverFromDuplicateSession(
  repo: PracticeRepository,
  userId: string,
  topicId: string | null,
  log: ReturnType<typeof createServiceLogger>
): Promise<PracticeSession> {
  // Retry finding the existing session (the winning request created it)
  const existingAfterRace = await repo.findActiveSession(userId, topicId);

  if (existingAfterRace) {
    log.info({
      event: "practice.session",
      meta: {
        type: "domain",
        userId,
        phase: "complete",
        sessionId: existingAfterRace.id,
        outcome: "success",
      },
    });
    return existingAfterRace;
  }

  // Extremely unlikely: constraint violated but session not found
  throw new DuplicateActiveSessionError(userId, topicId);
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
    // Handle race condition: another request created the session between findActiveSession and createSession
    if (isUniqueConstraintViolation(err)) {
      return recoverFromDuplicateSession(repo, userId, topicId, log);
    }

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
