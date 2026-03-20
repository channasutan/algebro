import "server-only";

import { canonicalize } from "./canonicalize";
import type { ValidationResult } from "../contracts/validation";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

export async function validateStep(
  input: { previousLatex: string; currentLatex: string },
  context: ServiceContext
): Promise<ValidationResult> {
  const log = createServiceLogger(context.requestId);

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
      errorType: isValid ? null : "invalid"
    };
  } catch {
    log.info({
      event: "practice.step-validation",
      meta: { type: "domain", phase: "validation", userId: "system", outcome: "failure", reason: "parse_error" }
    });

    return {
      isValid: false,
      errorType: "parse_error"
    };
  }
}
