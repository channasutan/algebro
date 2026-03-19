import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/observability";

describe("ProductionLogger Robustness", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("Normalization & Non-Mutation", () => {
    it("clones input to prevent mutation", () => {
      const meta = { type: "system", phase: "infra" } as const;
      const log = {
        event: "system.test" as any,
        requestId: "req-1",
        meta
      };
      
      logger.info(log);
      
      expect(log.requestId).toBe("req-1");
      expect(log.meta).toBe(meta); // Object reference unchanged
    });
  });

  describe("LOGGER_STRICT=true (Development)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("LOGGER_STRICT", "true");
    });

    it("throws if event format is invalid (missing dot)", () => {
      expect(() => {
        logger.info({ 
          event: "invalid-event" as any, 
          meta: { type: "system", phase: "infra" } 
        });
      }).toThrow(/Invalid event format/);
    });

    it("throws if domain log misses userId", () => {
      expect(() => {
        logger.info({ 
          event: "user-profiles.test" as any, 
          meta: { type: "domain", phase: "insert" } as any 
        });
      }).toThrow(/Domain logs must include non-empty userId/);
    });

    it("throws if phase is missing", () => {
      expect(() => {
        logger.info({ 
          event: "system.test" as any, 
          meta: { type: "system" } as any 
        });
      }).toThrow(/System logs must include phase/);
    });
  });

  describe("Production Mode Fallback", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("LOGGER_STRICT", "false");
    });

    it("does not throw on invalid format in production", () => {
      expect(() => {
        logger.info({ 
          event: "invalid-event" as any, 
          meta: { type: "system", phase: "infra" } 
        });
      }).not.toThrow();
    });

    it("injects _missingRequestId but No fake phase injection", () => {
      logger.info({ 
        event: "system.test" as any, 
        meta: { type: "system", phase: "infra" } 
      });
      
      const lastCall = (console.log as any).mock.calls[0][0];
      const parsed = JSON.parse(lastCall);
      expect(parsed.requestId).toBe("unknown");
      expect(parsed.meta._missingRequestId).toBe(true);
    });
  });
});
