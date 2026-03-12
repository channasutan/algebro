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

// ISO-8601 format: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss.sss+HH:MM
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;

function normalizeStringTimestamp(value: string): DomainEventTimestamp {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error("Invalid domain event timestamp: timestamp cannot be empty");
  }

  // Validate ISO-8601 format (accepts Z or timezone offset like +05:30)
  if (!ISO_8601_REGEX.test(trimmed)) {
    throw new Error(`Invalid domain event timestamp: must be ISO-8601 format (e.g., "2024-01-01T12:00:00.000Z" or "2024-01-01T12:00:00.000+05:30"), got: ${value}`);
  }

  const normalizedDate = new Date(trimmed);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error(`Invalid domain event timestamp: ${value}`);
  }

  return normalizedDate.toISOString();
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

/**
 * Recursively freezes an object and all its nested properties.
 * Creates a new WeakSet per invocation to prevent shared traversal state.
 * Handles cyclic structures safely.
 */
function deepFreeze<T>(value: T): Readonly<T> {
  const seen = new WeakSet<object>();
  return deepFreezeInternal(value, seen);
}

/**
 * Internal recursive implementation that tracks visited objects to prevent infinite recursion.
 */
function deepFreezeInternal<T>(value: T, seen: WeakSet<object>): Readonly<T> {
  if (typeof value !== "object" || value === null) {
    return value as Readonly<T>;
  }

  // Skip already frozen or visited objects
  if (Object.isFrozen(value) || seen.has(value)) {
    return value as Readonly<T>;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreezeInternal(item, seen);
    }
    return Object.freeze(value) as Readonly<T>;
  }

  // Traverse all keys including symbols for complete traversal
  for (const key of Reflect.ownKeys(value)) {
    const propertyValue = (value as Record<PropertyKey, unknown>)[key];
    deepFreezeInternal(propertyValue, seen);
  }

  return Object.freeze(value) as Readonly<T>;
}

function freezeEventPayload<TPayload extends DomainEventPayload>(payload: TPayload): Readonly<TPayload> {
  // Use structuredClone for deterministic deep cloning (preserves Dates, Sets, Maps, etc.)
  const cloned = structuredClone(payload);
  return deepFreeze(cloned);
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
