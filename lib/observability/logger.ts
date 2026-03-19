import { LogEvent, EventName, BaseMeta, DomainMeta } from "./types";

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
    // Non-mutating shallow clone
    const validatedLog: LogEvent = { 
      ...log, 
      meta: log.meta ? { ...log.meta } : { type: "system", phase: "infra" } as BaseMeta 
    };

    // Validation & Fallback
    try {
      this.validate(validatedLog);
    } catch (err) {
      if (process.env.NODE_ENV !== "production" && process.env.LOGGER_STRICT === "true") {
        throw err;
      }
      // Production fallback
      validatedLog.event = "unknown_event";
      validatedLog.meta = {
        ...validatedLog.meta,
        invalidEvent: true
      };
    }
    
    // Correlation guard
    if (!validatedLog.requestId) {
      validatedLog.meta = {
        ...validatedLog.meta,
        _missingRequestId: true
      };
      
      if (process.env.NODE_ENV === "development") {
        console.warn("[observability] missing requestId", validatedLog.event);
      }
    }

    return validatedLog;
  }

  private validate(log: LogEvent): void {
    if (!log.event || typeof log.event !== "string" || !log.event.includes(".")) {
      throw new Error(`[observability] Invalid event format: "${log.event}". Expected Domain.Action`);
    }

    if (!log.meta || typeof log.meta !== "object" || Array.isArray(log.meta)) {
      throw new Error("[observability] Missing or invalid metadata object");
    }

    if (log.meta.type === "domain") {
      const userId = typeof log.meta.userId === "string" ? log.meta.userId.trim() : "";
      if (!userId) {
        throw new Error(`[observability] Domain logs must include non-empty userId: ${log.event}`);
      }
      if (!log.meta.phase) {
        throw new Error(`[observability] Domain logs must include phase: ${log.event}`);
      }
    } else if (log.meta.type === "system") {
      if (!log.meta.phase) {
        throw new Error(`[observability] System logs must include phase: ${log.event}`);
      }
    } else {
      throw new Error(`[observability] Invalid meta type: ${(log.meta as any).type}`);
    }
  }

  private safeWrite(level: string, log: LogEvent): void {
    const event = log.event;
    const requestId = log.requestId || "unknown";

    try {
      const output = JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        ...log,
        event,
        requestId,
      });

      console.log(output);
    } catch (err) {
      const errorPayload = JSON.stringify({
        level: "EMERGENCY",
        event: "system.observability_failure",
        requestId,
        meta: { 
          originalEvent: event,
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
  if (!requestId && process.env.NODE_ENV === "development") {
    console.warn("[observability] createServiceLogger without requestId");
  }

  return {
    info: (event: EventName, meta: BaseMeta | DomainMeta) =>
      logger.info({ event, requestId, meta }),

    warn: (event: EventName, meta: BaseMeta | DomainMeta) =>
      logger.warn({ event, requestId, meta }),

    error: (event: EventName, meta: BaseMeta | DomainMeta) =>
      logger.error({ event, requestId, meta }),
  };
}
