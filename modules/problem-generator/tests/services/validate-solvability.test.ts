import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateSolvability } from "../../services/validate-solvability";
import type { ValidateProblemInput } from "../../contracts/validation";

// Mock SymPy client
vi.mock("@/infrastructure/math/sympy-client", () => ({
  sympyClient: {
    evaluate: vi.fn(),
  },
}));

import { sympyClient } from "@/infrastructure/math/sympy-client";

// Mock observability
vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const context = { requestId: "test-req" };

describe("validateSolvability", () => {
  // Test helpers to reduce duplication
  const mockEvaluate = () => vi.mocked(sympyClient.evaluate);

  const mockSuccess = (result: unknown) =>
    mockEvaluate().mockResolvedValue({ result });

  const mockFailure = (message: string) =>
    mockEvaluate().mockRejectedValue(new Error(message));

  const makeInput = (problemLatex: string): ValidateProblemInput => ({
    problemLatex,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isSolvable: true when SymPy finds a solution", async () => {
    mockSuccess({ x: 3 });
    const input = makeInput("2x + 4 = 10");

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(true);
    expect(result.errorType).toBeUndefined();
  });

  it("returns isSolvable: false with unsolvable error when no solution", async () => {
    mockSuccess(null);
    const input = makeInput("x = x + 1");

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("unsolvable");
  });

  it("returns parse_error when SymPy reports parse error", async () => {
    mockFailure("parse error: invalid syntax");
    const input = makeInput("%%%invalid%%%");

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("parse_error");
  });

  it("returns sympy_unavailable on network error", async () => {
    mockFailure("Network error: connection refused");
    const input = makeInput("2x = 4");

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("sympy_unavailable");
  });

  it("calls SymPy with correct parameters", async () => {
    mockSuccess({ x: 2 });
    const input = makeInput("2x = 4");

    await validateSolvability(input, context);

    expect(mockEvaluate()).toHaveBeenCalledWith({
      expression: "2x = 4",
      operation: "solve",
      context: {
        variable: "x",
      },
    });
  });

  it("handles SymPy timeout gracefully", async () => {
    mockFailure("timeout");
    const input = makeInput("complex equation");

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("sympy_unavailable");
  });
});
