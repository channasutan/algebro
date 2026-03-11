export type DomainEventPayload = Record<string, unknown>;

export type DomainEvent<TPayload extends DomainEventPayload = DomainEventPayload> = {
  id: string;
  type: string;
  occurredAt: string;
  payload: TPayload;
};

export type EventHandler<TPayload extends DomainEventPayload = DomainEventPayload> = (
  event: DomainEvent<TPayload>
) => void | Promise<void>;

export type EventUnsubscribe = () => void;
