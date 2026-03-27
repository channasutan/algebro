import "server-only";

import { cortexComputeEngine, MathParseError, toLatexString } from "@/lib/math";

export function canonicalize(latex: string): string {
  try {
    return cortexComputeEngine.canonicalizeLatex(toLatexString(latex));
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }

    throw new MathParseError("Unable to canonicalize LaTeX expression", {
      cause: error
    });
  }
}
