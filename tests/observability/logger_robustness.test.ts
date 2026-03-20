import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServiceLogger } from "@/lib/observability/logger";

describe("Logger Governance Robustness", () => {
  const requestId = "test-request-id";
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  
  // Helper to deduplicate logger creation + call
  const logAction = (event: any, meta?: any) => {
    const m = meta ?? { type: "system", phase: "test" };
    return createServiceLogger(requestId).info({ event, meta: m });
  };

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
    // "single" has only 1 segment
    expect(() => logAction("single")).toThrow(/Invalid event format/);
  });

  it("fails in dev if event has empty segments (e.g. double dots)", () => {
    expect(() => logAction("domain..action")).toThrow();
  });

  it("fails in dev if event starts or ends with dots", () => {
    expect(() => logAction(".domain.action")).toThrow();

    expect(() => logAction("domain.action.")).toThrow();
  });

  it("fails in dev if meta.type is domain but userId is missing", () => {
    expect(() => {
      logAction("domain.action", { type: "domain", phase: "test" });
    }).toThrow(/Domain logs must include non-empty userId/);
  });

  it("fails in dev if meta.type is domain but userId is an empty string", () => {
    expect(() => {
      logAction("domain.action", { type: "domain", userId: "  ", phase: "test" });
    }).toThrow(/Domain logs must include non-empty userId/);
  });

  it("allows arbitrary number of segments >= 2", () => {
    logAction("domain.sub.action.detail");
    
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("domain.sub.action.detail")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(requestId)
    );
  });

  it("falls back to unknown_event in production and does NOT throw", () => {
    vi.stubEnv("NODE_ENV", "production");
    
    // Should NOT throw even with invalid event
    logAction("invalid");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknown_event")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid")
    );
  });

  it("ensures userId is correctly trimmed and present in final log for domain events", () => {
    logAction("user.login", { type: "domain", userId: "  user-123  ", phase: "test" });

    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("user-123")
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("  user-123  ")
    );
  });

  it("guards against null or non-object metadata safely", () => {
    // Passing null meta should throw in dev
    expect(() => {
      logAction("test.event", null as any);
    }).toThrow(/Missing or invalid metadata/);
  });
});
