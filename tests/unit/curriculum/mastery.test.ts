import { describe, it, expect } from "vitest";
import {
  calculateMasteryScore,
  isMasteryImproved,
  clampMasteryScore,
  type AttemptHistory,
} from "../../../modules/curriculum/domain/mastery";
import {
  validateMasteryScore,
  assertMasteryScore,
} from "../../../modules/curriculum/domain/mastery-invariants";

function makeAttempt(
  result: "correct" | "incorrect",
  daysAgo: number
): AttemptHistory {
  const completedAt = new Date();
  completedAt.setDate(completedAt.getDate() - daysAgo);
  return { attemptId: `attempt-${Math.random()}`, result, completedAt };
}

describe("Mastery Domain", () => {
  describe("calculateMasteryScore", () => {
    it("returns 0 for empty history", () => {
      expect(calculateMasteryScore([])).toBe(0);
    });

    it("returns 1 for all correct attempts (recent, < 7 days)", () => {
      const history = [
        makeAttempt("correct", 1),
        makeAttempt("correct", 3),
        makeAttempt("correct", 5),
      ];
      expect(calculateMasteryScore(history)).toBe(1);
    });

    it("returns 0 for all incorrect attempts", () => {
      const history = [
        makeAttempt("incorrect", 1),
        makeAttempt("incorrect", 10),
      ];
      expect(calculateMasteryScore(history)).toBe(0);
    });

    it("returns 0.5 for 50/50 correct/incorrect at same age bracket", () => {
      const history = [
        makeAttempt("correct", 2),
        makeAttempt("incorrect", 3),
      ];
      expect(calculateMasteryScore(history)).toBe(0.5);
    });

    it("time-decay: scoreRecent > scoreOld when correct is recent vs old", () => {
      const recentHistory = [
        makeAttempt("correct", 1),
        makeAttempt("incorrect", 20),
      ];
      const oldHistory = [
        makeAttempt("incorrect", 1),
        makeAttempt("correct", 20),
      ];
      
      const scoreRecent = calculateMasteryScore(recentHistory);
      const scoreOld = calculateMasteryScore(oldHistory);
      
      expect(scoreRecent).toBeGreaterThan(scoreOld);
    });

    it("deterministic: same input = same output", () => {
      const history = [
        makeAttempt("correct", 4),
        makeAttempt("incorrect", 12),
        makeAttempt("correct", 35),
      ];
      const run1 = calculateMasteryScore(history);
      const run2 = calculateMasteryScore(history);
      
      expect(run1).toBe(run2);
    });

    it("result always within [0, 1]", () => {
      const history = [makeAttempt("correct", 0)];
      const score = calculateMasteryScore(history);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("validateMasteryScore", () => {
    it("true for 0", () => {
      expect(validateMasteryScore(0)).toBe(true);
    });

    it("true for 1", () => {
      expect(validateMasteryScore(1)).toBe(true);
    });

    it("true for 0.75", () => {
      expect(validateMasteryScore(0.75)).toBe(true);
    });

    it("false for -0.1", () => {
      expect(validateMasteryScore(-0.1)).toBe(false);
    });

    it("false for 1.1", () => {
      expect(validateMasteryScore(1.1)).toBe(false);
    });

    it("false for NaN", () => {
      expect(validateMasteryScore(NaN)).toBe(false);
    });
  });

  describe("assertMasteryScore", () => {
    it("throws containing \"MasteryInvariantViolation\" for 1.5", () => {
      expect(() => assertMasteryScore(1.5)).toThrowError("MasteryInvariantViolation");
    });

    it("does not throw for 0.8", () => {
      expect(() => assertMasteryScore(0.8)).not.toThrow();
    });
  });

  describe("isMasteryImproved", () => {
    it("true when current > previous (0.3, 0.5)", () => {
      expect(isMasteryImproved(0.3, 0.5)).toBe(true);
    });

    it("false when equal (0.5, 0.5)", () => {
      expect(isMasteryImproved(0.5, 0.5)).toBe(false);
    });

    it("false when current < previous (0.7, 0.4)", () => {
      expect(isMasteryImproved(0.7, 0.4)).toBe(false);
    });
  });
});
