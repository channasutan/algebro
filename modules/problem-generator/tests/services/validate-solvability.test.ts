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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isSolvable: true when SymPy finds a solution", async () => {
    const mockEvaluate = vi.mocked(sympyClient.evaluate);
    mockEvaluate.mockResolvedValue({
      result: { x: 3 }, // Solution exists
    });

    const input: ValidateProblemInput = {
      problemLatex: "2x + 4 = 10",
    };

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(true);
    expect(result.errorType).toBeUndefined();
  });

  it("returns isSolvable: false with unsolvable error when no solution", async () => {
    const mockEvaluate = vi.mocked(sympyClient.evaluate);
    mockEvaluate.mockResolvedValue({
      result: null, // No solution
    });

    const input: ValidateProblemInput = {
      problemLatex: "x = x + 1", // Contradiction
    };

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("unsolvable");
  });

  it("returns parse_error when SymPy reports parse error", async () => {
    const mockEvaluate = vi.mocked(sympyClient.evaluate);
    mockEvaluate.mockRejectedValue(new Error("parse error: invalid syntax"));

    const input: ValidateProblemInput = {
      problemLatex: "%%%invalid%%%",
    };

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("parse_error");
  });

  it("returns sympy_unavailable on network error", async () => {
    const mockEvaluate = vi.mocked(sympyClient.evaluate);
    mockEvaluate.mockRejectedValue(new Error("Network error: connection refused"));

    const input: ValidateProblemInput = {
      problemLatex: "2x = 4",
    };

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("sympy_unavailable");
  });

  it("calls SymPy with correct parameters", async () => {
    const mockEvaluate = vi.mocked(sympyClient.evaluate);
    mockEvaluate.mockResolvedValue({ result: { x: 2 } });

    const input: ValidateProblemInput = {
      problemLatex: "2x = 4",
    };

    await validateSolvability(input, context);

    expect(mockEvaluate).toHaveBeenCalledWith({
      expression: "2x = 4",
      operation: "solve",
      context: {
        variable: "x",
      },
    });
  });

  it("handles SymPy timeout gracefully", async () => {
    const mockEvaluate = vi.mocked(sympyClient.evaluate);
    mockEvaluate.mockRejectedValue(new Error("timeout"));

    const input: ValidateProblemInput = {
      problemLatex: "complex equation",
    };

    const result = await validateSolvability(input, context);

    expect(result.isSolvable).toBe(false);
    expect(result.errorType).toBe("sympy_unavailable");
  });
});
