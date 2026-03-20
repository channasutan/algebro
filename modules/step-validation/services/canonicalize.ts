import "server-only";

import { ComputeEngine } from "@cortex-js/compute-engine";

const ce = new ComputeEngine();

export function canonicalize(latex: string): string {
  try {
    const expr = ce.parse(latex);
    const simplified = expr.simplify();
    return simplified.toLatex();
  } catch {
    throw new Error("parse_error");
  }
}
