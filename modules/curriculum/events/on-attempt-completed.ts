import "server-only";

import type { AttemptCompletedEvent } from "@/events/attempt-events";
import type { EventHandler } from "@/events/event-types";
import type { CurriculumRepository } from "../repositories/supabase-curriculum-repository";
import { updateMastery } from "../services/update-mastery";
import { createServiceLogger } from "@/lib/observability";
import { createSupabasePracticeRepository } from "@/modules/practice/repositories/supabase-practice-repository";

export function handleAttemptCompleted(
  repo: CurriculumRepository
): EventHandler {
  return async (event) => {
    const typedEvent = event as AttemptCompletedEvent;
    const requestId = typedEvent.event_id;
    const log = createServiceLogger(requestId);

    try {
      const practiceRepo = createSupabasePracticeRepository();
      const attempt = await practiceRepo.getAttempt(typedEvent.payload.attempt_id);
      
      if (!attempt) {
        throw new Error(`Attempt ${typedEvent.payload.attempt_id} not found`);
      }

      await updateMastery(
        {
          userId: typedEvent.payload.user_id,
          topicId: typedEvent.payload.topic_id,
          attemptResult: attempt.isCorrect ? "correct" : "incorrect",
          attemptId: typedEvent.payload.attempt_id,
          completedAt: new Date(typedEvent.payload.completed_at),
        },
        repo
      );
    } catch (error) {
      log.error({
        event: "curriculum.event_failure",
        meta: {
          type: "system",
          phase: "infra",
          userId: typedEvent.payload.user_id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  };
}
