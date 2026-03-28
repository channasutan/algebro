import "server-only";

import type { AttemptCompletedEvent } from "@/events/attempt-events";
import type { EventHandler } from "@/events/event-types";
import type { CurriculumRepository } from "../repositories/curriculum-repository";
import { updateMastery } from "../services/update-mastery";
import { createServiceLogger } from "@/lib/observability";
import type { PracticeRepository } from "@/modules/practice/repositories/practice-repository";

async function processMasteryUpdate(
  event: AttemptCompletedEvent,
  practiceRepo: PracticeRepository,
  curriculumRepo: CurriculumRepository
): Promise<void> {
  // Skip curriculum mastery update when no topic is associated with this attempt
  if (!event.payload.topic_id) {
    return;
  }

  const attempt = await practiceRepo.getAttempt(event.payload.attempt_id);
  if (!attempt) {
    throw new Error(`Attempt ${event.payload.attempt_id} not found`);
  }

  const session = await practiceRepo.getSession(attempt.sessionId);
  if (!session) {
    throw new Error(`Session ${attempt.sessionId} not found`);
  }

  if (!session.topicId) {
    return;
  }

  // Derive userId and topicId strictly from persisted DB records —
  // never from caller-supplied event payload fields — to prevent
  // silent data corruption via stale or tampered IDs.
  await updateMastery(
    {
      userId: attempt.userId,
      topicId: session.topicId,
      attemptResult: attempt.isCorrect ? "correct" : "incorrect",
      attemptId: attempt.id,
      completedAt: new Date(event.payload.completed_at),
    },
    curriculumRepo
  );
}

export function handleAttemptCompleted(
  curriculumRepo: CurriculumRepository,
  practiceRepo: PracticeRepository
): EventHandler {
  return async (event) => {
    const typedEvent = event as AttemptCompletedEvent;
    const log = createServiceLogger(typedEvent.event_id);

    try {
      await processMasteryUpdate(typedEvent, practiceRepo, curriculumRepo);
    } catch (error) {
      log.error({
        event: "curriculum.event_failure",
        meta: {
          type: "system",
          phase: "infra",
          userId: typedEvent.payload.user_id,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  };
}