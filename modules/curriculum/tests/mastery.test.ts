import { describe, it, expect } from "vitest";
import { calculateMasteryScore, type AttemptHistory } from "../domain/mastery";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeAttempt(
  result: "correct" | "incorrect",
  daysAgo: number
): AttemptHistory {
  const completedAt = new Date();
  completedAt.setDate(completedAt.getDate() - daysAgo);
  return {
    attemptId: crypto.randomUUID(),
    result,
    completedAt,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("calculateMasteryScore", () => {
  describe("Edge cases", () => {
    it("empty history returns 0 without throwing", () => {
      expect(calculateMasteryScore([])).toBe(0);
    });

    it("single correct attempt today returns 1", () => {
      expect(calculateMasteryScore([makeAttempt("correct", 0)])).toBe(1);
    });

    it("single incorrect attempt today returns 0", () => {
      expect(calculateMasteryScore([makeAttempt("incorrect", 0)])).toBe(0);
    });
  });

  describe("Weight tiers — same-tier ratio preservation", () => {
    it("3 correct + 1 incorrect, all < 7 days → 0.75", () => {
      const history = [
        makeAttempt("correct", 1),
        makeAttempt("correct", 2),
        makeAttempt("correct", 3),
        makeAttempt("incorrect", 4),
      ];
      expect(calculateMasteryScore(history)).toBe(0.75);
    });

    it("3 correct + 1 incorrect, all 7–30 days → 0.75 (uniform weight preserves ratio)", () => {
      const history = [
        makeAttempt("correct", 10),
        makeAttempt("correct", 14),
        makeAttempt("correct", 20),
        makeAttempt("incorrect", 25),
      ];
      expect(calculateMasteryScore(history)).toBe(0.75);
    });

    it("3 correct + 1 incorrect, all > 30 days → 0.75 (uniform weight preserves ratio)", () => {
      const history = [
        makeAttempt("correct", 35),
        makeAttempt("correct", 45),
        makeAttempt("correct", 60),
        makeAttempt("incorrect", 90),
      ];
      expect(calculateMasteryScore(history)).toBe(0.75);
    });
  });

  describe("Time-decay cross-tier", () => {
    it("1 correct today (w=1.0) + 1 incorrect 15d ago (w=0.7) → 0.59", () => {
      // weightedCorrect=1.0, weightedTotal=1.7 → 1/1.7 ≈ 0.5882 → rounded 0.59
      const history = [
        makeAttempt("correct", 0),
        makeAttempt("incorrect", 15),
      ];
      expect(calculateMasteryScore(history)).toBe(0.59);
    });

    it("1 correct today (w=1.0) + 1 incorrect 45d ago (w=0.4) → 0.71", () => {
      // weightedCorrect=1.0, weightedTotal=1.4 → 1/1.4 ≈ 0.7142 → rounded 0.71
      const history = [
        makeAttempt("correct", 0),
        makeAttempt("incorrect", 45),
      ];
      expect(calculateMasteryScore(history)).toBe(0.71);
    });

    it("1 incorrect today (w=1.0) + 1 correct 45d ago (w=0.4) → 0.29", () => {
      // weightedCorrect=0.4, weightedTotal=1.4 → 0.4/1.4 ≈ 0.2857 → rounded 0.29
      const history = [
        makeAttempt("incorrect", 0),
        makeAttempt("correct", 45),
      ];
      expect(calculateMasteryScore(history)).toBe(0.29);
    });
  });

  describe("Return value constraints", () => {
    it("score is always >= 0", () => {
      const history = [makeAttempt("incorrect", 0), makeAttempt("incorrect", 60)];
      expect(calculateMasteryScore(history)).toBeGreaterThanOrEqual(0);
    });

    it("score is always <= 1", () => {
      const history = [makeAttempt("correct", 0), makeAttempt("correct", 60)];
      expect(calculateMasteryScore(history)).toBeLessThanOrEqual(1);
    });

    it("score has at most 2 decimal places", () => {
      const history = [
        makeAttempt("correct", 0),
        makeAttempt("incorrect", 15),
        makeAttempt("correct", 45),
      ];
      const score = calculateMasteryScore(history);
      const decimalPlaces = String(score).split(".")[1]?.length ?? 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});