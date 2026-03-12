export type DomainEventPayload = Record<string, unknown>;

export type DomainEventType =
  | "step_submitted"
  | "step_validated"
  | "attempt_completed"
  | "material_uploaded"
  | "material_processed"
  | "duel_started"
  | "duel_finished"
  | "subscription_updated";

export type DomainEvent<TPayload extends DomainEventPayload = DomainEventPayload> = Readonly<{
  event_id: string;
  event_type: DomainEventType;
  timestamp: string;
  payload: Readonly<TPayload>;
}>;

export type CreateDomainEventInput<TPayload extends DomainEventPayload = DomainEventPayload> = {
  eventId?: string;
  eventType: DomainEventType;
  timestamp?: Date | string;
  payload: TPayload;
};

export type EventHandler<TPayload extends DomainEventPayload = DomainEventPayload> = (
  event: DomainEvent<TPayload>
) => void | Promise<void>;

export type EventUnsubscribe = () => void;

export function createDomainEvent<TPayload extends DomainEventPayload>(
  input: CreateDomainEventInput<TPayload>
): DomainEvent<TPayload> {
  const timestamp = input.timestamp instanceof Date ? input.timestamp.toISOString() : input.timestamp;

  return {
    event_id: input.eventId ?? crypto.randomUUID(),
    event_type: input.eventType,
    timestamp: timestamp ?? new Date().toISOString(),
    payload: Object.freeze({ ...input.payload })
  };
}
