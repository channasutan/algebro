import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServiceLogger } from "@/lib/observability/logger";
import type { BaseMeta, DomainMeta } from "@/lib/observability/types";

describe("Logger Governance Robustness", () => {
  const requestId = "test-request-id";
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LOGGER_STRICT", "true");
    vi.stubEnv("NODE_ENV", "development");
    
    // Spy on console to verify output without printing to stdout
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("fails in dev if domain event segments are missing (at least 2 required)", () => {
    const log = createServiceLogger(requestId);
    
    // "single" has only 1 segment
    expect(() => log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "single" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    })).toThrow(/Invalid event format/);
  });

  it("fails in dev if event has empty segments (e.g. double dots)", () => {
    const log = createServiceLogger(requestId);
    
    expect(() => log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain..action" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    })).toThrow();
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
    }).toThrow(/Domain logs must include non-empty userId/);
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
    }).toThrow(/Domain logs must include non-empty userId/);
  });

  it("allows arbitrary number of segments >= 2", () => {
    const log = createServiceLogger(requestId);
    
    log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "domain.sub.action.detail" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "system", phase: "test" as any } 
    });
    
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("domain.sub.action.detail")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(requestId)
    );
  });

  it("falls back to unknown_event in production and does NOT throw", () => {
    vi.stubEnv("NODE_ENV", "production");
    
    const log = createServiceLogger(requestId);
    
    // Should NOT throw even with invalid event
    log.info({ 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event: "invalid" as any, 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta: { type: "system", phase: "test" as any } 
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknown_event")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid")
    );
  });

  it("ensures userId is correctly trimmed and present in final log for domain events", () => {
    const log = createServiceLogger(requestId);
    
    log.info({ 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event: "user.login" as any, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { type: "domain", userId: "  user-123  ", phase: "test" as any } 
    });

    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("user-123")
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("  user-123  ")
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
    }).toThrow(/Missing or invalid metadata/);
  });
});
