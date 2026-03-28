import { calculateMasteryScore as domainCalculate, type AttemptHistory } from "../domain/mastery";

// Thin service wrapper — delegates entirely to domain pure function.
// Exists as a stable public surface so callers don't reach into domain directly.
export function calculateMasteryScore(history: AttemptHistory[]): number {
  return domainCalculate(history);
}
