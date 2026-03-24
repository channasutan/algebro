import { sympyClient } from "@/infrastructure/math/sympy-client";
import type { ValidateProblemInput, ValidateProblemResult } from "../contracts/validation";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

/**
 * Validates that a problem is mathematically solvable using SymPy.
 *
 * @param input - Problem and solution LaTeX strings
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
      return { isSolvable: true };
    } else {
      return { isSolvable: false, errorType: "unsolvable" };
    }
  } catch (error) {
    // Check if it's a parsing error (malformed input)
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("parse") ||
      errorMessage.includes("syntax") ||
      errorMessage.includes("invalid")
    ) {
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

    // Network/unavailability error
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
}
