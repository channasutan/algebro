import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd(), "modules/curriculum");

describe("Curriculum module scaffold", () => {
  describe("Folder structure", () => {
    const requiredFolders = [
      "contracts",
      "domain",
      "services",
      "repositories",
      "events",
      "tests",
    ];

    for (const folder of requiredFolders) {
      it(`folder ${folder}/ exists`, () => {
        expect(existsSync(resolve(root, folder))).toBe(true);
      });
    }
  });

  describe("Required files", () => {
    const requiredFiles = [
      "index.ts",
      "contracts/index.ts",
      "contracts/get-recommended-problem.ts",
      "contracts/update-mastery.ts",
      "domain/mastery.ts",
      "services/get-recommended-problem.ts",
      "services/update-mastery.ts",
    ];

    for (const file of requiredFiles) {
      it(`file ${file} exists`, () => {
        expect(existsSync(resolve(root, file))).toBe(true);
      });
    }
  });

  describe("Domain pure functions", () => {
    it("validateMasteryScore(0.5) returns true", async () => {
      const { validateMasteryScore } = await import("../domain/mastery");
      expect(validateMasteryScore(0.5)).toBe(true);
    });

    it("validateMasteryScore(1.5) returns false", async () => {
      const { validateMasteryScore } = await import("../domain/mastery");
      expect(validateMasteryScore(1.5)).toBe(false);
    });

    it("isMasteryImproved(0.3, 0.5) returns true", async () => {
      const { isMasteryImproved } = await import("../domain/mastery");
      expect(isMasteryImproved(0.3, 0.5)).toBe(true);
    });

    it("clampMasteryScore(1.5) returns 1", async () => {
      const { clampMasteryScore } = await import("../domain/mastery");
      expect(clampMasteryScore(1.5)).toBe(1);
    });

    it("clampMasteryScore(-0.5) returns 0", async () => {
      const { clampMasteryScore } = await import("../domain/mastery");
      expect(clampMasteryScore(-0.5)).toBe(0);
    });
  });

  describe("Public API exports", () => {
    it("calculateMasteryScore is exported from module index", async () => {
      const mod = await import("../index");
      expect(typeof mod.calculateMasteryScore).toBe("function");
    });

    it("getRecommendedProblem is exported from module index", async () => {
      const mod = await import("../index");
      expect(typeof mod.getRecommendedProblem).toBe("function");
    });

    it("updateMastery is exported from module index", async () => {
      const mod = await import("../index");
      expect(typeof mod.updateMastery).toBe("function");
    });
  });
});
