import "server-only";

import { ComputeEngine } from "@cortex-js/compute-engine";

import { MathEquivalenceError, MathParseError } from "./errors";
import { LatexString, toLatexString } from "./types";

type ParsedExpression = {
  isValid: boolean;
  canonical: ParsedExpression;
  simplify(): ParsedExpression;
  toLatex(): string;
  isEqual(other: ParsedExpression): boolean | undefined;
};

const ce = new ComputeEngine();

/**
 * Checks if the value is a valid object (non-null, object type).
 */
function isObjectish(value: unknown): boolean {
  return !!value && typeof value === "object";
}

/**
 * Checks if the candidate has all required methods and properties.
 */
function hasRequiredInterface(candidate: Partial<ParsedExpression>): boolean {
  return (
    typeof candidate.canonical === "object" &&
    typeof candidate.simplify === "function" &&
    typeof candidate.toLatex === "function" &&
    typeof candidate.isEqual === "function" &&
    typeof candidate.isValid === "boolean"
  );
}

/**
 * Validates and casts a raw Cortex parse result to ParsedExpression.
 * Throws MathParseError if the result is invalid or missing required interface.
 */
function asParsedExpression(value: unknown): ParsedExpression {
  if (!isObjectish(value)) {
    throw new MathParseError("Unable to parse LaTeX expression");
  }

  const candidate = value as Partial<ParsedExpression>;

  if (!hasRequiredInterface(candidate)) {
    throw new MathParseError("Unable to parse LaTeX expression");
  }

  if (!candidate.isValid) {
    throw new MathParseError("Unable to parse LaTeX expression");
  }

  return candidate as ParsedExpression;
}

/**
 * Parses LaTeX using Compute Engine and returns a valid expression.
 * Throws MathParseError if parsing fails or produces invalid result.
 */
function parseExpressionOrThrow(latex: string): ParsedExpression {
  const parsed = ce.parse(latex);
  return asParsedExpression(parsed);
}

/**
 * Internal helper: parses LaTeX, applies a transform, serializes to LaTeX string.
 * This centralizes the parse→transform→serialize→catch shell for string-returning functions.
 */
function withLatexTransform(
  latex: LatexString,
  transform: (expr: ParsedExpression) => ParsedExpression,
  errorContext: string
): LatexString {
  try {
    const parsed = parseLatex(latex);
    const transformed = transform(parsed);
    return toLatexString(transformed.toLatex());
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }
    throw new MathParseError(`Unable to ${errorContext} LaTeX expression`, { cause: error });
  }
}

/**
 * Parses LaTeX into a structured expression.
 */
function parseLatex(latex: LatexString): ParsedExpression {
  try {
    return parseExpressionOrThrow(latex);
  } catch (error) {
    if (error instanceof MathParseError) {
      throw error;
    }
    throw new MathParseError("Unable to parse LaTeX expression", { cause: error });
  }
}

/**
 * Returns the canonical form of a LaTeX expression as a string.
 */
function canonicalizeLatex(latex: LatexString): LatexString {
  return withLatexTransform(latex, (expr) => expr.canonical, "canonicalize");
}

/**
 * Returns the simplified form of a LaTeX expression as a string.
 */
function simplifyLatex(latex: LatexString): LatexString {
  return withLatexTransform(latex, (expr) => expr.simplify(), "simplify");
}

/**
 * Checks if the equivalence result is definitively true.
 */
function isDefinitelyEquivalent(result: boolean | undefined): boolean {
  return result === true;
}

/**
 * Checks if equivalence result is unknown and should trigger fallback.
 */
function shouldThrowOnUnknownEquivalence(result: boolean | undefined): boolean {
  return result === undefined;
}

/**
 * Checks if two LaTeX expressions are mathematically equivalent.
 */
function areEquivalent(previousLatex: LatexString, currentLatex: LatexString): boolean {
  const previous = parseLatex(previousLatex);
  const current = parseLatex(currentLatex);
  const result = previous.isEqual(current);

  if (shouldThrowOnUnknownEquivalence(result)) {
    throw new MathEquivalenceError("Unable to determine expression equivalence");
  }

  return isDefinitelyEquivalent(result);
}

export const cortexComputeEngine = {
  parseLatex,
  canonicalizeLatex,
  simplifyLatex,
  areEquivalent
};
