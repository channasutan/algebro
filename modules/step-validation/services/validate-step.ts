import "server-only";

import { canonicalize } from "./canonicalize";
import { classifyStep } from "./classify-step";
import { detectErrorType } from "./detect-error-type";
import type { StepType, ValidationResult } from "../contracts/validation";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { cortexComputeEngine, MathEquivalenceError, MathParseError, toLatexString } from "@/lib/math";
import { sympyClient } from "@/lib/math/sympy-client";

/**
 * Runs SymPy fallback when Cortex fails.
 * Returns validation result based on SymPy response.
 */
async function resolveWithSympy(
  input: { previousLatex: string; currentLatex: string },
  cortexError: unknown,
  log: ReturnType<typeof createServiceLogger>,
  stepType: StepType | null
): Promise<ValidationResult> {
  try {
    const sympyResult = await sympyClient.evaluate({
      expression: input.previousLatex,
      operation: "equivalence",
      context: { target: input.currentLatex }
    });

    const isValid = sympyResult.result === true;
    let errorType: "parse_error" | "non_equivalent_transformation" | null = null;
    if (!isValid) {
      errorType = cortexError instanceof MathParseError
        ? "parse_error"
        : "non_equivalent_transformation";
    }

    return { isValid, errorType, stepType };
  } catch (sympyError) {
    log.warn({
      event: "practice.step-validation",
      meta: {
        type: "domain",
        phase: "validation",
        userId: "system",
        outcome: "failure",
        reason: "parse_error",
        error: sympyError
      }
    });

    return {
      isValid: false,
      errorType: "parse_error",
      stepType: null
    };
  }
}

export async function validateStep(
  input: { previousLatex: string; currentLatex: string },
  context: ServiceContext
): Promise<ValidationResult> {
  const log = createServiceLogger(context.requestId);
  const stepType = classifyStep(input);

  log.info({
    event: "practice.step-validation",
    meta: { type: "domain", phase: "start", userId: "system" }
  });

  try {
    const isValid = cortexComputeEngine.areEquivalent(
      toLatexString(input.previousLatex),
      toLatexString(input.currentLatex)
    );

    // Only compute canonical forms when needed (invalid steps for error detection and logging)
    let previousCanonical: string | null = null;
    let currentCanonical: string | null = null;

    if (!isValid) {
      try {
        previousCanonical = canonicalize(input.previousLatex);
        currentCanonical = canonicalize(input.currentLatex);
      } catch {
        previousCanonical = null;
        currentCanonical = null;
      }
    }

    log.info({
      event: "practice.step-validation",
      meta: {
        type: "domain",
        phase: "complete",
        userId: "system",
        outcome: isValid ? "success" : "failure",
        previousCanonical,
        currentCanonical
      }
    });

    return {
      isValid,
      errorType: isValid ? null : detectErrorType(input),
      stepType
    };
  } catch (cortexError) {
    // Determine the specific error reason for observability
    let errorReason: string;
    if (cortexError instanceof MathParseError) {
      errorReason = "cortex_parse_error";
    } else if (cortexError instanceof MathEquivalenceError) {
      errorReason = "cortex_equivalence_error";
    } else {
      errorReason = "cortex_error";
    }

    log.warn({
      event: "practice.step-validation",
      meta: {
        type: "domain",
        phase: "validation",
        userId: "system",
        reason: errorReason,
        fallback: "sympy_fallback"
      }
    });

    // Use SymPy fallback when Cortex fails
    return resolveWithSympy(input, cortexError, log, stepType);
  }
}
