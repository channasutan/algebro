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

      // Fetch canonical attempt row — source of truth for userId and result
      const attempt = await practiceRepo.getAttempt(typedEvent.payload.attempt_id);
      if (!attempt) {
        throw new Error(`Attempt ${typedEvent.payload.attempt_id} not found`);
      }

      // Fetch the associated session to get the DB-verified topicId
      const session = await practiceRepo.getSession(attempt.sessionId);
      if (!session) {
        throw new Error(`Session ${attempt.sessionId} not found`);
      }

      // Skip curriculum mastery update when no topic is associated with this session
      if (!session.topicId) {
        log.info({
          event: "curriculum.skip_mastery",
          meta: {
            type: "domain",
            phase: "start",
            userId: attempt.userId,
            attemptId: attempt.id,
            reason: "no_topic_id",
          },
        });
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
