import { eventBus } from "@/events/event-bus";
import { createDomainEvent } from "@/events/event-types";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { Attempt } from "../domain/practice";
import { PracticeRepository } from "../repositories/practice-repository";
import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";

export type CompleteAttemptInput = {
  attemptId: string;
  userId: string;
  topicId?: string | null;
  isCorrect: boolean;
};

export async function completeAttempt(
  input: CompleteAttemptInput,
  context: ServiceContext
): Promise<Attempt> {
  const repo = createSupabasePracticeRepository();
  return completeAttemptWithRepository(repo, input, context);
}

export async function completeAttemptWithRepository(
  repo: PracticeRepository,
  input: CompleteAttemptInput,
  context: ServiceContext
): Promise<Attempt> {
  const { attemptId, userId, topicId = null, isCorrect } = input;
  const { requestId } = context;
  const log = createServiceLogger(requestId);

  log.info({
    event: "practice.attempt",
    meta: { type: "domain", userId, phase: "start", attemptId, topicId, isCorrect }
  });

  try {
    const completedAt = new Date().toISOString();
    const attempt = await repo.completeAttempt(attemptId, { completedAt, isCorrect });

    eventBus
      .publish(
        createDomainEvent({
          eventType: "attempt_completed",
          payload: {
            attempt_id: attemptId,
            user_id: userId,
            topic_id: topicId,
            is_correct: isCorrect,
            completed_at: completedAt
          }
        })
      )
      .catch((err) => {
      log.warn({
        event: "practice.attempt",
        meta: {
          type: "domain",
          userId,
          phase: "infra",
          outcome: "failure",
          attemptId,
          error: err instanceof Error ? err.message : String(err)
        }
      });
      });

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
        attemptId,
        topicId,
        error: err instanceof Error ? err.message : String(err)
      }
    });
    throw err;
  }
}
