export type SymbolicErrorType =
  | "syntax_error"
  | "non_equivalent_transformation"
  | "incorrect_distribution"
  | "sign_error"
  | "invalid_equation_operation";

export type StepType =
  | "symbolic_transformation"
  | "equation_operation"
  | "calculus_operation"
  | "substitution"
  | "assumption"
  | "logical_reasoning"
  | "definition";

export type ValidationErrorType = SymbolicErrorType | "parse_error";

export type ValidationResult = {
  isValid: boolean;
  errorType: ValidationErrorType | null;
  stepType: StepType | null;
};
