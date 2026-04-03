import type { DomainEvent } from "./event-types";

export const AI_HINT_REQUESTED = "ai_hint_requested" as const;

export type AiHintRequestedPayload = {
  userId: string;
  problemId: string;
  hintCount: number;
  requestedAt: string; // ISO-8601 timestamp — set via new Date().toISOString() at emit time
};

export type AiHintRequestedEvent = DomainEvent<AiHintRequestedPayload>;
