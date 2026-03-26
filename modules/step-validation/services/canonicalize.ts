import "server-only";

import { cortexComputeEngine } from "@/lib/math/cortex-compute-engine";
import { MathParseError } from "@/lib/math/errors";

export function canonicalize(latex: string): string {
  try {
    return cortexComputeEngine.canonicalizeLatex(latex);
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }

    throw new MathParseError("Unable to canonicalize LaTeX expression", {
      cause: error
    });
  }
}
