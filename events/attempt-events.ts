import type { DomainEvent } from "./event-types";

export const ATTEMPT_COMPLETED = "attempt_completed" as const;

export type AttemptCompletedPayload = {
  attempt_id: string;
  user_id: string;
  problem_id: string;
  topic_id: string;
  completed_at: string;
};

export type AttemptCompletedEvent = DomainEvent<AttemptCompletedPayload>;
