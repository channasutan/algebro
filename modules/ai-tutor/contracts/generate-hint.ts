import { z } from "zod";

import type { ValidationErrorType } from "@/modules/step-validation/contracts/validation";

export type QuotaExceededReason = "quota_exceeded";
export type AiUnavailableReason = "ai_unavailable";
export type ValidationErrorReason = "validation_error";

const validationErrorValues = [
  "syntax_error",
  "non_equivalent_transformation",
  "incorrect_distribution",
  "sign_error",
  "invalid_equation_operation",
  "parse_error"
] as const satisfies readonly ValidationErrorType[];

export const GenerateHintInputSchema = z.object({
  userId: z.string(),
  problemId: z.string(),
  problemLatex: z.string(),
  studentStepLatex: z.string(),
  errorType: z.enum(validationErrorValues).nullable(),
  previousStepsLatex: z.array(z.string()),
  hintCount: z.number().int().nonnegative()
});

export type GenerateHintInput = z.infer<typeof GenerateHintInputSchema>;

export type GenerateHintResult =
  | { success: true; hint: string }
  | {
      success: false;
      reason: QuotaExceededReason | AiUnavailableReason | ValidationErrorReason;
    };
