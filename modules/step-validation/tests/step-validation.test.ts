import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { evaluateMock } = vi.hoisted(() => ({
  evaluateMock: vi.fn()
}));

vi.mock("@/infrastructure/math/sympy-client", () => ({
  sympyClient: {
    evaluate: evaluateMock
  }
}));

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

const canonicalMap: Record<string, string> = {
  "2(x+3)": "2x+6",
  "2x+6": "2x+6",
  "x^2+2x+1": "(x+1)^2",
  "(x+1)^2": "(x+1)^2",
  "2x=4": "x=2",
  "2x + 4": "2x+4",
  "2x+4": "2x+4",
  "-((-2x-6))": "2x+6"
};

// Helper to create mock parse result for ComputeEngine
function createMockParseResult(latex: string) {
  const shouldFail = latex.includes("%%%");
  return {
    simplify: vi.fn(() => {
      if (shouldFail) {
        throw new Error("bad input");
      }
      return {
        toLatex: vi.fn(() => canonicalMap[latex] ?? latex)
      };
    })
  };
}

// Helper to create mock ComputeEngine instance
function createMockComputeEngine() {
  return {
    parse: vi.fn((latex: string) => createMockParseResult(latex))
  };
}

vi.mock("@cortex-js/compute-engine", () => ({
  ComputeEngine: vi.fn().mockImplementation(() => createMockComputeEngine())
}));

import * as canonicalizeModule from "../services/canonicalize";

// Helper to wrap tests where canonicalize is mocked to fail (CortexJS failure scenario)
async function withCortexFailing<T>(fn: () => Promise<T>): Promise<T> {
  const canonicalizeSpy = vi
    .spyOn(canonicalizeModule, "canonicalize")
    .mockImplementation(() => {
      throw new Error("cortex-fail");
    });

  try {
    return await fn();
  } finally {
    canonicalizeSpy.mockRestore();
  }
}

import { canonicalize } from "../services/canonicalize";
import { classifyStep } from "../services/classify-step";
import { detectErrorType } from "../services/detect-error-type";
import { validateStep } from "../services/validate-step";

const context = { requestId: "test-req" };

describe("canonicalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canonical form of a valid expression", () => {
    const result = canonicalize("2x+6");
    expect(result).toBe("2x+6");
  });

  it("normalizes equivalent expressions to the same canonical form", () => {
    expect(canonicalize("2(x+3)")).toBe(canonicalize("2x+6"));
  });

  it("throws parse_error for unparseable input", () => {
    expect(() => canonicalize("%%%invalid%%%")).toThrow("parse_error");
  });
});

describe("classifyStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies calculus operations", () => {
    expect(classifyStep({ previousLatex: "x^2", currentLatex: "\\int x^2 dx" })).toBe("calculus_operation");
  });

  it("classifies equation operations", () => {
    expect(classifyStep({ previousLatex: "7x", currentLatex: "7x=28" })).toBe("equation_operation");
  });

  it("classifies substitution from step text", () => {
    expect(classifyStep({ previousLatex: "x", currentLatex: "x", stepText: "Let x = 0" })).toBe("substitution");
  });

  it("classifies assumption from step text", () => {
    expect(classifyStep({ previousLatex: "a", currentLatex: "b", stepText: "Assume f(a)=f(b)" })).toBe("assumption");
  });

  it("classifies logical reasoning from step text", () => {
    expect(classifyStep({ previousLatex: "a", currentLatex: "b", stepText: "Therefore a = b" })).toBe("logical_reasoning");
  });

  it("falls back to symbolic_transformation", () => {
    expect(classifyStep({ previousLatex: "2x+4", currentLatex: "2x+6" })).toBe("symbolic_transformation");
  });
});

describe("detectErrorType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects sign_error", () => {
    expect(detectErrorType({ previousLatex: "2x+6", currentLatex: "-2x-6" })).toBe("sign_error");
  });

  it("detects incorrect_distribution", () => {
    expect(detectErrorType({ previousLatex: "2(x+3)", currentLatex: "2x+3" })).toBe("incorrect_distribution");
  });

  it("falls back to non_equivalent_transformation", () => {
    expect(detectErrorType({ previousLatex: "2x+4", currentLatex: "3x+1" })).toBe("non_equivalent_transformation");
  });
});

describe("validateStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateMock.mockReset();
  });

  it("returns isValid: true when step is algebraically equivalent", async () => {
    const result = await validateStep({ previousLatex: "2(x+3)", currentLatex: "2x+6" }, context);
    expect(result.isValid).toBe(true);
    expect(result.errorType).toBeNull();
  });

  it("returns symbolic error type for non-equivalent step", async () => {
    const result = await validateStep({ previousLatex: "2x+4", currentLatex: "2x=4" }, context);
    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe("non_equivalent_transformation");
  });

  it("returns isValid: false with errorType 'parse_error' when canonicalize and SymPy fail", async () => {
    evaluateMock.mockRejectedValueOnce(new Error("sympy-fail"));

    const result = await withCortexFailing(() =>
      validateStep({ previousLatex: "%%%bad%%%", currentLatex: "2x+6" }, context)
    );

    expect(result.isValid).toBe(false);
    expect(result.errorType).toBe("parse_error");
    expect(result.stepType).toBeNull();
  });
});

describe("validateStep - SymPy fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateMock.mockReset();
  });

  it("returns valid when Cortex fails and SymPy returns true", async () => {
    evaluateMock.mockResolvedValueOnce({ result: true });

    const result = await withCortexFailing(() =>
      validateStep({ previousLatex: "2x+4", currentLatex: "2x+4" }, context)
    );

    expect(result).toEqual({
      isValid: true,
      errorType: null,
      stepType: "symbolic_transformation"
    });
  });

  it("returns non_equivalent_transformation when Cortex fails and SymPy returns false", async () => {
    evaluateMock.mockResolvedValueOnce({ result: false });

    const result = await withCortexFailing(() =>
      validateStep({ previousLatex: "2x+4", currentLatex: "2x=4" }, context)
    );

    expect(result).toEqual({
      isValid: false,
      errorType: "non_equivalent_transformation",
      stepType: "equation_operation"
    });
  });

  it("returns parse_error and null stepType when Cortex and SymPy both fail", async () => {
    evaluateMock.mockRejectedValueOnce(new Error("sympy-fail"));

    const result = await withCortexFailing(() =>
      validateStep({ previousLatex: "2x+4", currentLatex: "2x+6" }, context)
    );

    expect(result).toEqual({
      isValid: false,
      errorType: "parse_error",
      stepType: null
    });
  });
});
