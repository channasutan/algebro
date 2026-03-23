import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only so tests run in Vitest without Next.js runtime
vi.mock("server-only", () => ({}));

// Mock observability first (no dependencies)
vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Use a global object to share state between mock factory and tests
// This avoids the hoisting issue with vi.mock
const globalMockState = {
  shouldThrow: false,
  throwError: null as Error | null,
};

// Mock @cortex-js/compute-engine
vi.mock("@cortex-js/compute-engine", () => {
  const canonical: Record<string, string> = {
    "2(x+3)":    "2x+6",
    "2x+6":      "2x+6",
    "x^2+2x+1":  "(x+1)^2",
    "(x+1)^2":   "(x+1)^2",
    "2x=4":      "x=2",
    "2x + 4":    "2x+4",
  };

  return {
    ComputeEngine: vi.fn().mockImplementation(() => ({
      parse: vi.fn((latex: string) => ({
        simplify: () => {
          if (globalMockState.shouldThrow) {
            throw globalMockState.throwError || new Error("parse error");
          }
          return { toLatex: () => canonical[latex] ?? latex };
        },
      })),
    })),
  };
});

import { canonicalize } from "../services/canonicalize";
import { validateStep } from "../services/validate-step";

const context = { requestId: "test-req" };

describe("canonicalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalMockState.shouldThrow = false;
    globalMockState.throwError = null;
  });

  it("returns canonical form of a valid expression", () => {
    const result = canonicalize("2x+6");
    expect(result).toBe("2x+6");
  });

  it("normalizes equivalent expressions to the same canonical form", () => {
    expect(canonicalize("2(x+3)")).toBe(canonicalize("2x+6"));
  });

  it("throws parse_error for unparseable input", () => {
    globalMockState.shouldThrow = true;
    expect(() => canonicalize("%%%invalid%%%")).toThrow("parse_error");
  });
});

describe("validateStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalMockState.shouldThrow = false;
    globalMockState.throwError = null;
  });

  it("returns isValid: true when step is algebraically equivalent", async () => {
    const result = await validateStep(
      { previousLatex: "2(x+3)", currentLatex: "2x+6" },
      context
    );
    expect(result.isValid).toBe(true);
    expect(result.errorType).toBeNull();
  });

  it("returns isValid: false with errorType 'invalid' for non-equivalent step", async () => {
    const result = await validateStep(
      { previousLatex: "2x+4", currentLatex: "2x=4" },
      context
    );
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe("invalid");
  });

  it("returns isValid: false with errorType 'parse_error' when canonicalize throws", async () => {
    globalMockState.shouldThrow = true;
    const result = await validateStep(
      { previousLatex: "%%%bad%%%", currentLatex: "2x+6" },
      context
    );
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe("parse_error");
  });
});
