import "server-only";

import { canonicalize } from "./canonicalize";
import { classifyStep } from "./classify-step";
import { detectErrorType } from "./detect-error-type";
import type { ValidationResult } from "../contracts/validation";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { sympyClient } from "@/infrastructure/math/sympy-client";

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
    const previousCanonical = canonicalize(input.previousLatex);
    const currentCanonical = canonicalize(input.currentLatex);

    const isValid = previousCanonical === currentCanonical;

    log.info({
      event: "practice.step-validation",
      meta: { type: "domain", phase: "complete", userId: "system", outcome: isValid ? "success" : "failure" }
    });

    return {
      isValid,
      errorType: isValid ? null : detectErrorType(input),
      stepType
    };
  } catch {
    log.warn({
      event: "practice.step-validation",
      meta: { type: "domain", phase: "validation", userId: "system", reason: "cortex_error", fallback: "sympy_fallback" }
    });

    try {
      const sympyResult = await sympyClient.evaluate({
        expression: input.previousLatex,
        operation: "equivalence",
        context: { target: input.currentLatex }
      });

      const isValid = sympyResult.result === true;
      const errorType = isValid ? null : ("non_equivalent_transformation" as const);

      return { isValid, errorType, stepType };
    } catch (sympyError) {
    log.warn({
      event: "practice.step-validation",
      meta: { type: "domain", phase: "validation", userId: "system", outcome: "failure", reason: "parse_error", error: sympyError }
    });

    return {
      isValid: false,
      errorType: "parse_error",
      stepType: null
    };
    }
  }
}
