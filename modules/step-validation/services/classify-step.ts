import type { StepType } from "../contracts/validation";

export function classifyStep(input: {
  previousLatex: string;
  currentLatex: string;
  stepText?: string;
}): StepType {
  const source = `${input.currentLatex} ${input.stepText ?? ""}`;
  const text = input.stepText ?? "";

  if (/\\(int|sum|lim|prod)|\\frac\{d\}|\\partial|d\s*\/\s*dx/i.test(source)) {
    return "calculus_operation";
  }

  if (/^let\s/i.test(text)) {
    return "substitution";
  }

  if (/^(assume|suppose)\s/i.test(text)) {
    return "assumption";
  }

  if (/^(therefore|hence|thus|since)\s/i.test(text)) {
    return "logical_reasoning";
  }

  if (/^define\s/i.test(text)) {
    return "definition";
  }

  if (input.currentLatex.includes("=")) {
    return "equation_operation";
  }

  return "symbolic_transformation";
}
