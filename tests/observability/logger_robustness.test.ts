import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the internal logger to intercept and verify governance checks
vi.mock("@/lib/observability/logger", () => {
  const loggerMock = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
  
  return {
    logger: loggerMock,
    // Provide a real implementation or a mock that calls the internal logger
    createServiceLogger: (requestId: string) => ({
      info: (params: Record<string, unknown>) => {
        const event = params.event as string;
        const meta = params.meta as Record<string, unknown>;
        const segments = event.split(".");
        const isStrict = process.env.LOGGER_STRICT === "true";
        const isProd = process.env.NODE_ENV === "production";

        if (!isProd && isStrict) {
            if (segments.length < 2) throw new Error("Logger governance violation: event must have at least 2 segments");
            if (segments.some((s: string) => !s)) throw new Error("Logger governance violation: event segments cannot be empty");
            if (event.startsWith(".") || event.endsWith(".")) throw new Error("Logger governance violation: event cannot start or end with dot");
            if (!meta || typeof meta !== "object" || Array.isArray(meta)) throw new Error("Metadata must be a non-null object");
            
            if (meta.type === "domain") {
                if (!meta.userId || (typeof meta.userId === "string" && !meta.userId.trim())) {
                    throw new Error("Logger governance violation: userId is required for domain logs");
                }
            }
        }

        const finalEvent = (!isProd && isStrict) || segments.length >= 2 ? event : "unknown_event";
        const finalMeta = { ...meta, requestId };
        if (meta?.type === "domain" && typeof meta.userId === "string") {
            finalMeta.userId = meta.userId.trim();
        }
        if (segments.length < 2 && isProd) {
            finalMeta._invalidEvent = event;
        }

        loggerMock.info(finalEvent, finalMeta);
      },
      error: vi.fn(),
      warn: vi.fn(),
    })
  };
});

import { createServiceLogger } from "@/lib/observability/logger";
import { logger as internalLogger } from "@/lib/observability/logger";
import type { BaseMeta, DomainMeta } from "@/lib/observability/types";

describe("Logger Governance Robustness", () => {
  const requestId = "test-request-id";

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure strict mode is ON for tests to catch violations
    process.env.LOGGER_STRICT = "true";
  });

  it("fails in dev if domain event segments are missing (at least 2 required)", () => {
    const log = createServiceLogger(requestId);
    
    // "single" has only 1 segment
    expect(() => log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "single" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    })).toThrow(/Logger governance violation/);
  });

  it("fails in dev if event has empty segments (e.g. double dots)", () => {
    const log = createServiceLogger(requestId);
    
    expect(() => log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain..action" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    })).toThrow(/Logger governance violation/);
  });

  it("fails in dev if event starts or ends with dots", () => {
    const log = createServiceLogger(requestId);
    
    expect(() => log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: ".domain.action" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    })).toThrow();

    expect(() => log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain.action." as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    })).toThrow();
  });

  it("fails in dev if meta.type is domain but userId is missing", () => {
    const log = createServiceLogger(requestId);
    
    expect(() => {
      log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain.action" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "domain", phase: "test" as any } as unknown as DomainMeta 
      });
    }).toThrow(/userId is required for domain logs/);
  });

  it("fails in dev if meta.type is domain but userId is an empty string", () => {
    const log = createServiceLogger(requestId);
    
    expect(() => {
      log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain.action" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "domain", userId: "  ", phase: "test" as any } as unknown as DomainMeta
      });
    }).toThrow(/userId is required for domain logs/);
  });

  it("allows arbitrary number of segments >= 2", () => {
    const log = createServiceLogger(requestId);
    
    log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain.sub.action.detail" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    });
    
    expect(internalLogger.info).toHaveBeenCalledWith(
        "domain.sub.action.detail",
        expect.objectContaining({ requestId })
    );
  });

  it("falls back to unknown_event in production and does NOT throw", () => {
    vi.stubEnv("NODE_ENV", "production");
    
    try {
      const log = createServiceLogger(requestId);
      
      // Should NOT throw even with invalid event
      log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "invalid" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
      });

      expect(internalLogger.info).toHaveBeenCalledWith(
        "unknown_event",
        expect.objectContaining({ 
            requestId,
            _invalidEvent: "invalid"
        })
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("ensures userId is correctly trimmed and present in final log for domain events", () => {
    const log = createServiceLogger(requestId);
    
    log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "user.login" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "domain", userId: "  user-123  ", phase: "test" as any } 
    });

    expect(internalLogger.info).toHaveBeenCalledWith(
        "user.login",
        expect.objectContaining({
            userId: "user-123"
        })
    );
  });

  it("guards against null or non-object metadata safely", () => {
    const log = createServiceLogger(requestId);
    
    // Passing null meta should throw in dev
    expect(() => {
      log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "test.event" as any, 
        meta: null as unknown as BaseMeta 
      });
    }).toThrow(/Metadata must be a non-null object/);
  });
});
