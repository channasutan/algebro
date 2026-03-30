export type DomainEventPayload = Record<string, unknown>;

export type CoreDomainEventType =
  // step events
  | "step_submitted"
  | "step_validated"
  | "attempt_completed"
  // material events
  | "material_uploaded"
  | "material_processed"
  // duel events
  | "duel_started"
  | "duel_finished"
  // subscription events
  | "subscription_updated"
  // authentication events
  | "auth_user_registered"
  // user profile events
  | "user_profile_initialized"
  | "user_profile_updated";

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
// Requires timezone (Z or offset like +05:30); optional milliseconds (.sss, exactly 3 digits)
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

  // Normalize to UTC for deterministic event ordering and storage.
  // Input timestamps with timezone offsets are converted to UTC (toISOString).
  // Original timezone information is intentionally discarded.
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
 * Recursively applies Object.freeze to plain objects and arrays to prevent accidental mutation.
 * - Creates a new WeakSet per invocation to prevent shared traversal state.
 * - Traverses own properties including symbols.
 *
 * Note: This function assumes the input is a valid, cloneable JSON-like payload.
 * Cyclic structures are handled safely by this function.
 *
 * Limitations:
 * - Prevents accidental mutation of JSON-like payloads (plain objects/arrays).
 * - Built-in objects with internal mutable state (Date, Map, Set) are NOT fully immutable.
 * - Map and Set entries are not traversed—only the container reference is frozen.
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

/**
 * Deep clones and freezes the event payload for immutability.
 * - Relies on structuredClone (Node 18+ or modern browsers) for deterministic cloning.
 * - Preserves Dates, Sets, Maps, Errors, and other structured data.
 * - Supports cyclic object graphs.
 * - Payload must contain structured-cloneable data (no functions, symbols, WeakMap, or WeakSet).
 */
function freezeEventPayload<TPayload extends DomainEventPayload>(payload: TPayload): Readonly<TPayload> {
  let cloned: TPayload;

  try {
    cloned = structuredClone(payload);
  } catch (error) {
    throw new Error(
      "Event payload must contain only structured-cloneable data (objects, arrays, primitives, Date, Map, Set, Error, etc.). " +
        "Functions, symbols, WeakMap, and WeakSet are not allowed.",
      { cause: error }
    );
  }

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

// ---------------------------------------------------------------------------
// Material events — re-exported from dedicated module
// ---------------------------------------------------------------------------
export {
  MATERIAL_UPLOADED,
  MATERIAL_PROCESSED,
  type MaterialUploadedPayload,
  type MaterialProcessedPayload
} from './material-events'
