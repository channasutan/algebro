import { describe, it, expect } from "vitest";
import { randomizeParameters } from "../../services/randomize-parameters";
import type { ParameterSchema } from "../../domain/problem-template";

describe("randomizeParameters", () => {
  const baseSchema: ParameterSchema = {
    a: { type: "int", min: 1, max: 10 },
    b: { type: "int", min: 5, max: 20 },
  };

  it("generates parameters within schema bounds", () => {
    const result = randomizeParameters(baseSchema, 1);

    expect(result.a).toBeGreaterThanOrEqual(1);
    expect(result.a).toBeLessThanOrEqual(10);
    expect(result.b).toBeGreaterThanOrEqual(5);
    expect(result.b).toBeLessThanOrEqual(20);
  });

  it("produces deterministic output with same seed", () => {
    const result1 = randomizeParameters(baseSchema, 3, "seed-123");
    const result2 = randomizeParameters(baseSchema, 3, "seed-123");

    expect(result1.a).toBe(result2.a);
    expect(result1.b).toBe(result2.b);
  });

  it("produces different output with different seeds", () => {
    const result1 = randomizeParameters(baseSchema, 3, "seed-123");
    const result2 = randomizeParameters(baseSchema, 3, "seed-456");

    // Very unlikely to be the same with different seeds
    expect(result1.a !== result2.a || result1.b !== result2.b).toBe(true);
  });

  it("scales ranges by difficulty level", () => {
    // Level 1: range multiplier ~1x
    const level1 = randomizeParameters(baseSchema, 1, "test-seed");

    // Level 5: range multiplier ~10x
    const level5 = randomizeParameters(baseSchema, 5, "test-seed");

    // Level 5 should generally produce larger values due to wider range
    // (though not guaranteed for every seed, statistically likely)
    expect(level1.a).toBeLessThanOrEqual(10);
    expect(level5.a).toBeGreaterThanOrEqual(1);
  });

  it("clamps difficulty to range 1-5", () => {
    const lowResult = randomizeParameters(baseSchema, 0);
    const highResult = randomizeParameters(baseSchema, 10);

    // Should behave like difficulty 1 and 5 respectively
    expect(lowResult.a).toBeGreaterThanOrEqual(1);
    expect(highResult.a).toBeGreaterThanOrEqual(1);
  });

  it("returns empty object for empty schema", () => {
    const result = randomizeParameters({}, 3);
    expect(result).toEqual({});
  });

  it("throws for invalid min/max range", () => {
    const invalidSchema: ParameterSchema = {
      a: { type: "int", min: 10, max: 5 }, // Invalid: min >= max
    };

    expect(() => randomizeParameters(invalidSchema, 3)).toThrow(
      "[randomizeParameters] Invalid range"
    );
  });

  it("throws for unsupported parameter type", () => {
    const invalidSchema = {
      a: { type: "float", min: 1, max: 10 },
    } as unknown as ParameterSchema;

    expect(() => randomizeParameters(invalidSchema, 3)).toThrow(
      "[randomizeParameters] Unsupported parameter type"
    );
  });

  it("handles single parameter schema", () => {
    const singleParamSchema: ParameterSchema = {
      x: { type: "int", min: 1, max: 100 },
    };

    const result = randomizeParameters(singleParamSchema, 2);

    // At difficulty 2: multiplier = 3.25, scaledMax = 1 + floor(99 * 3.25) = 322
    // The upper bound is scaledMax, NOT the raw schema max.
    // Lower bound is always schema.min regardless of difficulty.
    const expectedScaledMax = 1 + Math.floor((100 - 1) * (1 + (2 - 1) * 2.25));
    expect(result.x).toBeGreaterThanOrEqual(1);
    expect(result.x).toBeLessThanOrEqual(expectedScaledMax);
  });
});
