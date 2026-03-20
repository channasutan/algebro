export type ValidationResult = {
  isValid: boolean;
  errorType: "invalid" | "parse_error" | null;
};
