import type { ParameterSchema } from "../domain/problem-template";

/**
 * Generates deterministic random parameters from a schema based on difficulty.
 * Higher difficulty = wider parameter ranges.
 *
 * Difficulty scaling:
 * - Level 1: range multiplier 1x (e.g., 1-10)
 * - Level 3: range multiplier 5x (e.g., 1-50)
 * - Level 5: range multiplier 10x (e.g., 1-100)
 */
export function randomizeParameters(
  schema: ParameterSchema,
  difficulty: number,
  seed?: string
): Record<string, number> {
  if (!schema || Object.keys(schema).length === 0) {
    return {};
  }

  // Validate difficulty range
  const normalizedDifficulty = Math.max(1, Math.min(5, difficulty));

  // Calculate difficulty multiplier (1x to 10x)
  const multiplier = 1 + (normalizedDifficulty - 1) * 2.25; // 1, 3.25, 5.5, 7.75, 10

  // Create RNG with optional seed
  const rng = createSeededRandom(seed);

  const result: Record<string, number> = {};

  for (const [paramName, definition] of Object.entries(schema)) {
    if (definition.type !== "int") {
      throw new Error(`[randomizeParameters] Unsupported parameter type: ${definition.type}`);
    }

    // Validate min/max
    if (definition.min >= definition.max) {
      throw new Error(
        `[randomizeParameters] Invalid range for ${paramName}: min (${definition.min}) must be less than max (${definition.max})`
      );
    }

    // Scale range by difficulty
    const range = definition.max - definition.min;
    const scaledRange = Math.floor(range * multiplier);
    const scaledMax = definition.min + scaledRange;

    // Generate random integer in [min, scaledMax]
    result[paramName] = Math.floor(rng() * (scaledMax - definition.min + 1)) + definition.min;
  }

  return result;
}

/**
 * Creates a seeded random number generator.
 * If no seed provided, uses Math.random().
 */
function createSeededRandom(seed?: string): () => number {
  if (!seed) {
    return Math.random;
  }

  // Simple xorshift-based seeded RNG
  let state = hashStringToNumber(seed);

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return Math.abs(state) / 2147483647;
  };
}

/**
 * Hashes a string to a numeric seed.
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}
