/**
 * Domain invariants for mastery scoring.
 * Enforced at domain boundary — never bypassed.
 */

export function validateMasteryScore(score: number): boolean {
  return typeof score === "number" && !Number.isNaN(score) && score >= 0 && score <= 1;
}

export function assertMasteryScore(score: number): void {
  if (!validateMasteryScore(score)) {
    throw new Error(
      `MasteryInvariantViolation: score must be in [0, 1], got ${score}`
    );
  }
}
