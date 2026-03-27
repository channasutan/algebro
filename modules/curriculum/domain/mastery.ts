import { validateMasteryScore } from "./mastery-invariants";

export type TopicMastery = {
  userId: string;
  topicId: string;
  /** Invariant: 0 <= masteryScore <= 1 */
  masteryScore: number;
  lastPracticedAt: Date | null;
};

export type AttemptHistory = {
  attemptId: string;
  result: "correct" | "incorrect";
  completedAt: Date;
};

/**
 * Returns the time-decay weight for an attempt based on age in days.
 * < 7 days  → 1.0 (recent)
 * 7–30 days → 0.7 (medium decay)
 * > 30 days → 0.4 (strong decay)
 */
function getAttemptWeight(daysDiff: number): number {
  if (daysDiff < 7) return 1;
  if (daysDiff <= 30) return 0.7;
  return 0.4;
}

/**
 * Time-decay weighted mastery score.
 * Recent attempts (< 7 days)  weight = 1.0
 * Older attempts  (7-30 days) weight = 0.7
 * Very old        (> 30 days) weight = 0.4
 *
 * Returns value in [0.0, 1.0], rounded to 2 decimal places.
 */
export function calculateMasteryScore(history: AttemptHistory[]): number {
  if (history.length === 0) return 0;

  const now = new Date();
  let weightedCorrect = 0;
  let weightedTotal = 0;

  for (const attempt of history) {
    const daysDiff =
      (now.getTime() - attempt.completedAt.getTime()) / (1000 * 60 * 60 * 24);
    const weight = getAttemptWeight(daysDiff);

    weightedTotal += weight;
    if (attempt.result === "correct") weightedCorrect += weight;
  }

  const score = weightedTotal === 0 ? 0 : weightedCorrect / weightedTotal;
  const rounded = Math.round(score * 100) / 100;

  if (!validateMasteryScore(rounded)) {
    throw new Error(
      `MasteryInvariantViolation: score ${rounded} is outside [0, 1]`
    );
  }

  return rounded;
}

/** Returns true if current score is strictly better than previous */
export function isMasteryImproved(previous: number, current: number): boolean {
  return current > previous;
}

/** Clamp score to valid range [0, 1] */
export function clampMasteryScore(score: number): number {
  return Math.min(1, Math.max(0, score));
}

// Convenience re-export — validateMasteryScore available from this module without reaching into mastery-invariants
export { validateMasteryScore } from "./mastery-invariants";