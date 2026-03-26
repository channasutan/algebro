import type { SymbolicErrorType } from "../contracts/validation";
import { canonicalize } from "./canonicalize";

export function detectErrorType(input: {
  previousLatex: string;
  currentLatex: string;
}): SymbolicErrorType {
  try {
    try {
      const negated = canonicalize(`-((${input.currentLatex}))`);
      if (negated === canonicalize(input.previousLatex)) {
        return "sign_error";
      }
    } catch {
      // skip
    }

    try {
      const hasDistPattern = /[a-z0-9]\s*(\(|\\\[)/i.test(input.previousLatex);
      if (hasDistPattern) {
        return "incorrect_distribution";
      }
    } catch {
      // skip
    }

    try {
      if (input.previousLatex.includes("=") && input.currentLatex.includes("=")) {
        return "invalid_equation_operation";
      }
    } catch {
      // skip
    }

    return "non_equivalent_transformation";
  } catch {
    return "non_equivalent_transformation";
  }
}
