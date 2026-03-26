import "server-only";

import { ComputeEngine } from "@cortex-js/compute-engine";

import { MathEquivalenceError, MathParseError } from "./errors";

type ParsedExpression = {
  isValid: boolean;
  canonical: ParsedExpression;
  simplify(): ParsedExpression;
  toLatex(): string;
  isEqual(other: ParsedExpression): boolean | undefined;
};

const ce = new ComputeEngine();

function asParsedExpression(value: unknown): ParsedExpression {
  if (!value || typeof value !== "object") {
    throw new MathParseError("Unable to parse LaTeX expression");
  }

  const candidate = value as Partial<ParsedExpression>;

  if (
    typeof candidate.canonical !== "object" ||
    typeof candidate.simplify !== "function" ||
    typeof candidate.toLatex !== "function" ||
    typeof candidate.isEqual !== "function" ||
    typeof candidate.isValid !== "boolean"
  ) {
    throw new MathParseError("Unable to parse LaTeX expression");
  }

  if (!candidate.isValid) {
    throw new MathParseError("Unable to parse LaTeX expression");
  }

  return candidate as ParsedExpression;
}

function parseLatex(latex: string): ParsedExpression {
  try {
    return asParsedExpression(ce.parse(latex));
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }

    throw new MathParseError("Unable to parse LaTeX expression", { cause: error });
  }
}

function canonicalizeLatex(latex: string): string {
  try {
    const expression = parseLatex(latex);
    return expression.canonical.toLatex();
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }

    throw new MathParseError("Unable to canonicalize LaTeX expression", {
      cause: error
    });
  }
}

function simplifyLatex(latex: string): string {
  try {
    return parseLatex(latex).simplify().toLatex();
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }

    throw new MathParseError("Unable to simplify LaTeX expression", { cause: error });
  }
}

function areEquivalent(previousLatex: string, currentLatex: string): boolean {
  try {
    const previous = parseLatex(previousLatex);
    const current = parseLatex(currentLatex);
    const result = previous.isEqual(current);

    if (result === undefined) {
      throw new MathEquivalenceError("Unable to determine expression equivalence");
    }

    return result;
  } catch (error) {
    if (error instanceof MathParseError || error instanceof MathEquivalenceError) {
      throw error;
    }

    throw new MathEquivalenceError("Unable to compare expression equivalence", {
      cause: error
    });
  }
}

export const cortexComputeEngine = {
  parseLatex,
  canonicalizeLatex,
  simplifyLatex,
  areEquivalent
};
