import { LogEvent, BaseMeta, DomainMeta, EventName } from "./types";
import { getPublicEnv, getLoggerStrict } from "@/config/env.server-entry";

/**
 * Ensures the event exists and is a string.
 */
function assertEventType(event: unknown): string {
  if (typeof event !== "string") {
    throw new TypeError(`[observability] Invalid event format: "${String(event)}". Event must be a string.`);
  }

  if (!event) {
    throw new Error(`[observability] Invalid event format: "${String(event)}". Event must not be empty.`);
  }

  return event;
}

/**
 * Ensures the event does not start or end with dots.
 */
function assertEventFormat(event: string): void {
  const eStr = String(event);

  if (event.startsWith(".")) {
    throw new Error(`[observability] Invalid event format: "${eStr}". Event must not start/end with dots.`);
  }

  if (event.endsWith(".")) {
    throw new Error(`[observability] Invalid event format: "${eStr}". Event must not start/end with dots.`);
  }
}

/**
 * Ensures the event has sufficient segments and no empty segments.
 */
function assertEventSegments(event: string): void {
  const eStr = String(event);
  const segments = event.split(".");
  
  if (segments.length < 2) {
    throw new Error(`[observability] Invalid event format: "${eStr}". Expected at least 2 segments (Domain.Action)`);
  }

  for (const segment of segments) {
    if (!segment) {
      throw new Error(`[observability] Invalid event format: "${eStr}". Event segments cannot be empty`);
    }
  }
}

/**
 * Validates the event name against governance rules.
 * Throws error in development/strict mode if validation fails.
 */
function validateEvent(event: string): void {
  const e = assertEventType(event);
  assertEventFormat(e);
  assertEventSegments(e);
}

/**
 * Ensures metadata is a non-null object and not an array.
 */
function assertMetaShape(meta: unknown): Record<string, unknown> {
  if (!meta) {
    throw new Error("[observability] Missing or invalid metadata object");
  }

  if (typeof meta !== "object") {
    throw new TypeError("[observability] Missing or invalid metadata object");
  }

  if (Array.isArray(meta)) {
    throw new TypeError("[observability] Missing or invalid metadata object");
  }

  return meta as Record<string, unknown>;
}

/**
 * Ensures metadata includes a phase.
 */
function assertMetaPhase(meta: Record<string, unknown>, event: string): void {
  if (!meta.phase) {
    throw new Error(`[observability] Logs must include phase: ${String(event)}`);
  }
}

/**
 * Ensures metadata type is either domain or system.
 */
function assertMetaType(meta: Record<string, unknown>): void {
  if (meta.type === "domain") {
    return;
  }

  if (meta.type !== "system") {
    throw new Error(`[observability] Invalid meta type: ${meta.type}`);
  }
}

/**
 * Ensures domain metadata includes a non-empty userId.
 */
function assertDomainMeta(meta: Record<string, unknown>, event: string): void {
  if (meta.type !== "domain") {
    return;
  }

  const userId = typeof meta.userId === "string" ? meta.userId.trim() : "";
  if (!userId) {
    throw new Error(`[observability] Domain logs must include non-empty userId: ${String(event)}`);
  }
}

/**
 * Validates metadata structure and required fields based on type.
 */
function validateMeta(meta: unknown, event: string): void {
  const m = assertMetaShape(meta);
  assertMetaPhase(m, event);
  assertMetaType(m);
  assertDomainMeta(m, event);
}

/**
 * Normalizes event name, falling back to unknown_event if invalid.
 */
function normalizeEvent(event: string): EventName {
  try {
    validateEvent(event);
    return event as EventName;
  } catch (err) {
    if (getPublicEnv().nodeEnv !== "production" && getLoggerStrict()) {
      throw err;
    }
    return "unknown_event";
  }
}

/**
 * Normalizes metadata, injecting requestId and marking invalid events.
 */
function normalizeMeta(meta: unknown, event: string, requestId?: string): BaseMeta | DomainMeta {
  const metaSafe = (meta as Record<string, unknown>) ?? {};
  const normalized = { ...metaSafe };
  
  // Trimming for Domain Events
  if (normalized.type === "domain" && typeof normalized.userId === "string") {
    normalized.userId = normalized.userId.trim();
  }

  // Mark as invalid if event was changed
  if (event === "unknown_event" && metaSafe.type !== "unknown_event") {
    normalized.invalidEvent = true;
  }

  // Handle missing requestId
  if (!requestId) {
    normalized._missingRequestId = true;
    if (getPublicEnv().nodeEnv === "development") {
      console.warn("[observability] missing requestId", event);
    }
  }

  return normalized as unknown as BaseMeta | DomainMeta;
}

/**
 * Hardened production-grade synchronous logger.
 * Enforces a strict LogEvent schema and ensures zero-leakage error handling.
 */
class ProductionLogger {
  info(log: LogEvent): void {
    this.safeWrite("INFO", this.normalize(log));
  }

  warn(log: LogEvent): void {
    this.safeWrite("WARN", this.normalize(log));
  }

  error(log: LogEvent): void {
    this.safeWrite("ERROR", this.normalize(log));
  }

  private normalize(log: LogEvent): LogEvent {
    const event = normalizeEvent(log.event);
    
    // Validate meta if in strict/dev mode
    try {
      validateMeta(log.meta, event);
    } catch (err) {
      if (getPublicEnv().nodeEnv !== "production" && getLoggerStrict()) {
        throw err;
      }
    }

    const meta = normalizeMeta(log.meta, event, log.requestId);

    return {
      ...log,
      event,
      meta
    };
  }

  private safeWrite(level: string, log: LogEvent): void {
    const requestId = log.requestId || "unknown";

    try {
      const output = JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        ...log,
        requestId,
      });

      console.log(output);
    } catch (err) {
      const errorPayload = JSON.stringify({
        level: "EMERGENCY",
        event: "system.observability_failure",
        requestId,
        meta: { 
          originalEvent: log.event,
          error: err instanceof Error ? err.message : String(err)
        }
      });
      process.stderr.write(`${errorPayload}\n`);
    }
  }
}

export const logger = new ProductionLogger();

/**
 * Factory for creating a bounded logger instance tied to a requestId.
 * Lightweight, direct call to base logger, zero overhead.
 */
export function createServiceLogger(requestId?: string) {
  if (!requestId && getPublicEnv().nodeEnv === "development") {
    console.warn("[observability] createServiceLogger without requestId");
  }

  const logWithRequestId = (level: "info" | "warn" | "error", log: Omit<LogEvent, "requestId">) => {
    logger[level]({ ...log, requestId });
  };

  return {
    info: (log: Omit<LogEvent, "requestId">) => logWithRequestId("info", log),
    warn: (log: Omit<LogEvent, "requestId">) => logWithRequestId("warn", log),
    error: (log: Omit<LogEvent, "requestId">) => logWithRequestId("error", log),
  };
}
