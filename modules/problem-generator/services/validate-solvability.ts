import { sympyClient } from "@/lib/math/sympy-client";
import type { ValidateProblemInput, ValidateProblemResult } from "../contracts/validation";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

/**
 * Checks if an error message indicates a parsing/malformed input error.
 */
function isParseError(message: string): boolean {
  return (
    message.includes("parse") ||
    message.includes("syntax") ||
    message.includes("invalid")
  );
}

/**
 * Handles SymPy errors by classifying them as parse errors or infrastructure errors.
 */
function handleSymPyError(
  error: unknown,
  log: ReturnType<typeof createServiceLogger>
): ValidateProblemResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (isParseError(errorMessage)) {
    log.warn({
      event: "practice.validate-solvability",
      meta: {
        type: "domain",
        phase: "validation",
        userId: "system",
        outcome: "failure",
        reason: "parse_error",
      },
    });
    return { isSolvable: false, errorType: "parse_error" };
  }

  log.error({
    event: "practice.validate-solvability",
    meta: {
      type: "domain",
      phase: "infra",
      userId: "system",
      outcome: "failure",
      reason: "sympy_unavailable",
      error: errorMessage,
    },
  });
  return { isSolvable: false, errorType: "sympy_unavailable" };
}

/**
 * Validates that a problem is mathematically solvable using SymPy.
 *
 * @param input - Problem LaTeX string
 * @param context - Service context for logging
 * @returns Validation result indicating solvability
 */
export async function validateSolvability(
  input: ValidateProblemInput,
  context: ServiceContext
): Promise<ValidateProblemResult> {
  const log = createServiceLogger(context.requestId);

  log.info({
    event: "practice.validate-solvability",
    meta: { type: "domain", phase: "start", userId: "system" },
  });

  try {
    // Call SymPy to check if the equation is solvable
    const response = await sympyClient.evaluate({
      expression: input.problemLatex,
      operation: "solve",
      context: {
        variable: "x", // Default to solving for x
      },
    });

    // Check if SymPy returned a valid solution
    const hasSolution = response.result !== null && response.result !== undefined;

    log.info({
      event: "practice.validate-solvability",
      meta: {
        type: "domain",
        phase: "complete",
        userId: "system",
        outcome: hasSolution ? "success" : "failure",
        reason: hasSolution ? undefined : "unsolvable",
      },
    });

    if (hasSolution) {
      return { isSolvable: true, solutionRaw: response.result };
    } else {
      return { isSolvable: false, errorType: "unsolvable" };
    }
  } catch (error) {
    return handleSymPyError(error, log);
  }
}
