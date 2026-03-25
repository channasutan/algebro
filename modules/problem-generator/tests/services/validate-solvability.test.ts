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
  const getMockEvaluate = () => vi.mocked(sympyClient.evaluate);

  const mockSympySuccess = (result: unknown) => {
    getMockEvaluate().mockResolvedValue({ result });
  };

  const mockSympyFailure = (message: string) => {
    getMockEvaluate().mockRejectedValue(new Error(message));
  };

  const makeInput = (problemLatex: string): ValidateProblemInput => ({
    problemLatex,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("success cases", () => {
    it.each`
      problemLatex      | expectedResult
      ${"2x + 4 = 10"}  | ${true}
      ${"x = 5"}        | ${true}
      ${"3x - 6 = 0"}   | ${true}
    `("returns isSolvable: $expectedResult for '$problemLatex'", async ({ problemLatex, expectedResult }) => {
      mockSympySuccess({ x: 3 });
      const input = makeInput(problemLatex);

      const result = await validateSolvability(input, context);

      expect(result.isSolvable).toBe(expectedResult);
      expect(result.errorType).toBeUndefined();
    });
  });

  describe("unsolvable cases", () => {
    it.each`
      problemLatex
      ${"x = x + 1"}
      ${"0 = 1"}
      ${"2 = 3"}
    `("returns isSolvable: false for unsolvable '$problemLatex'", async ({ problemLatex }) => {
      mockSympySuccess(null);
      const input = makeInput(problemLatex);

      const result = await validateSolvability(input, context);

      expect(result.isSolvable).toBe(false);
      expect(result.errorType).toBe("unsolvable");
    });
  });

  describe("error cases", () => {
    it.each`
      errorMessage                         | expectedErrorType
      ${"parse error: invalid syntax"}     | ${"parse_error"}
      ${"invalid expression"}              | ${"parse_error"}
      ${"bad syntax in equation"}          | ${"parse_error"}
      ${"Network error: connection refused"} | ${"sympy_unavailable"}
      ${"timeout"}                         | ${"sympy_unavailable"}
      ${"ETIMEDOUT"}                       | ${"sympy_unavailable"}
    `("returns errorType '$expectedErrorType' for '$errorMessage'", async ({ errorMessage, expectedErrorType }) => {
      mockSympyFailure(errorMessage);
      const input = makeInput("some equation");

      const result = await validateSolvability(input, context);

      expect(result.isSolvable).toBe(false);
      expect(result.errorType).toBe(expectedErrorType);
    });
  });

  it("calls SymPy with correct parameters", async () => {
    mockSympySuccess({ x: 2 });
    const input = makeInput("2x = 4");

    await validateSolvability(input, context);

    expect(getMockEvaluate()).toHaveBeenCalledWith({
      expression: "2x = 4",
      operation: "solve",
      context: {
        variable: "x",
      },
    });
  });
});