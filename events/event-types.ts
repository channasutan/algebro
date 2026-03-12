export type DomainEventPayload = Record<string, unknown>;

export type CoreDomainEventType =
  | "step_submitted"
  | "step_validated"
  | "attempt_completed"
  | "material_uploaded"
  | "material_processed"
  | "duel_started"
  | "duel_finished"
  | "subscription_updated";

export type DomainEventType = CoreDomainEventType | (string & {});

export type DomainEventTimestamp = string;

export type DomainEvent<TPayload extends DomainEventPayload = DomainEventPayload> = Readonly<{
  event_id: string;
  event_type: DomainEventType;
  timestamp: DomainEventTimestamp;
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

function normalizeEventType(eventType: DomainEventType): DomainEventType {
  const normalizedEventType = eventType.trim();

  if (normalizedEventType.length === 0) {
    throw new Error("Domain events require a non-empty event_type");
  }

  return normalizedEventType;
}

function currentTimestamp(): DomainEventTimestamp {
  return new Date().toISOString();
}

function normalizeDateTimestamp(date: Date): DomainEventTimestamp {
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid domain event timestamp: ${date}`);
  }
  return date.toISOString();
}

function normalizeStringTimestamp(value: string): DomainEventTimestamp {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error("Invalid domain event timestamp: timestamp cannot be empty");
  }

  const normalizedDate = new Date(trimmed);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error(`Invalid domain event timestamp: ${value}`);
  }

  // Validate ISO-8601 format to reject ambiguous timestamps
  const isoString = normalizedDate.toISOString();
  if (!trimmed.startsWith(isoString.substring(0, 10))) {
    throw new Error(`Invalid domain event timestamp: must be ISO-8601 format, got: ${value}`);
  }

  return isoString;
}

function normalizeTimestamp(timestamp?: Date | string | null): DomainEventTimestamp {
  if (timestamp === undefined || timestamp === null) {
    return currentTimestamp();
  }

  if (timestamp instanceof Date) {
    return normalizeDateTimestamp(timestamp);
  }

  return normalizeStringTimestamp(timestamp);
}

const frozenObjects = new WeakSet<object>();

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== "object" || value === null) {
    return value as Readonly<T>;
  }

  if (Object.isFrozen(value) || frozenObjects.has(value)) {
    return value as Readonly<T>;
  }

  frozenObjects.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }

    return Object.freeze(value) as Readonly<T>;
  }

  // Include symbol keys for complete traversal
  for (const key of Reflect.ownKeys(value)) {
    const propertyValue = (value as Record<PropertyKey, unknown>)[key];
    deepFreeze(propertyValue);
  }

  return Object.freeze(value) as Readonly<T>;
}

function freezeEventPayload<TPayload extends DomainEventPayload>(payload: TPayload): Readonly<TPayload> {
  try {
    return deepFreeze(structuredClone(payload));
  } catch (error) {
    throw new Error(
      "Event payload must contain only serializable data (no functions, symbols, or non-cloneable values)"
    );
  }
}

export function createDomainEvent<TPayload extends DomainEventPayload>(
  input: CreateDomainEventInput<TPayload>
): DomainEvent<TPayload> {
  return {
    event_id: input.eventId ?? crypto.randomUUID(),
    event_type: normalizeEventType(input.eventType),
    timestamp: normalizeTimestamp(input.timestamp),
    payload: freezeEventPayload(input.payload)
  };
}
