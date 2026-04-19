import { createSupabasePracticeRepository } from "@/repositories/practice/supabase-practice-repository";
import { PracticeRepository } from "@/repositories/practice/practice-repository";
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
 * Recovers from race condition by finding the existing session that was created
 * by another concurrent request.
 */
async function recoverFromDuplicateSession(
  repo: PracticeRepository,
  userId: string,
  topicId: string | null,
  log: ReturnType<typeof createServiceLogger>
): Promise<PracticeSession> {
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
      log.warn({
        event: "practice.session",
        meta: {
          type: "domain",
          userId,
          phase: "infra",
          outcome: "failure",
          reason: "unique_constraint",
        },
      });
      return recoverFromDuplicateSession(repo, userId, topicId, log);
    }

    log.error({
      event: "practice.session",
      meta: {
        type: "domain",
        userId,
        phase: "infra",
        outcome: "failure",
        error: getErrorMessage(err),
      }
    });
    throw err;
  }
}

const UNIQUE_CONSTRAINT_CODE = "23505";
type ErrorLike = { code?: unknown; message?: unknown; cause?: unknown };

/**
 * Returns true when the error represents a PostgreSQL unique constraint violation.
 * Business rule: a user may not have two active sessions for the same topic.
 */
function isUniqueConstraintViolation(err: unknown): boolean {
  return getErrorCauseChain(err).some(hasUniqueConstraintMarker);
}

function getErrorCauseChain(err: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  const visited = new Set<unknown>();
  let current: unknown = err;

  while (isErrorLike(current) && !visited.has(current)) {
    visited.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function hasUniqueConstraintMarker(error: ErrorLike): boolean {
  return (
    error.code === UNIQUE_CONSTRAINT_CODE ||
    (typeof error.message === "string" && error.message.includes(UNIQUE_CONSTRAINT_CODE))
  );
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
