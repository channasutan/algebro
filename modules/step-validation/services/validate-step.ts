import "server-only";

import { canonicalize } from "./canonicalize";
import { classifyStep } from "./classify-step";
import { detectErrorType } from "./detect-error-type";
import type { ValidationResult } from "../contracts/validation";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { cortexComputeEngine } from "@/infrastructure/math/cortex-compute-engine";
import { sympyClient } from "@/infrastructure/math/sympy-client";
import { MathEquivalenceError, MathParseError } from "@/infrastructure/math/errors";

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
    const isValid = cortexComputeEngine.areEquivalent(input.previousLatex, input.currentLatex);

    let previousCanonical: string | null = null;
    let currentCanonical: string | null = null;

    try {
      previousCanonical = canonicalize(input.previousLatex);
      currentCanonical = canonicalize(input.currentLatex);
    } catch {
      previousCanonical = null;
      currentCanonical = null;
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
    log.warn({
      event: "practice.step-validation",
      meta: {
        type: "domain",
        phase: "validation",
        userId: "system",
        reason:
          cortexError instanceof MathParseError
            ? "cortex_parse_error"
            : cortexError instanceof MathEquivalenceError
              ? "cortex_equivalence_error"
              : "cortex_error",
        fallback: "sympy_fallback"
      }
    });

    try {
      const sympyResult = await sympyClient.evaluate({
        expression: input.previousLatex,
        operation: "equivalence",
        context: { target: input.currentLatex }
      });

      const isValid = sympyResult.result === true;
      const errorType = isValid ? null : detectErrorType(input);

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
}
