export { validateStep } from "./services/validate-step";
export type { ValidationResult } from "./contracts/validation";

export const stepValidationModule = {
  name: "step-validation",
} as const;
