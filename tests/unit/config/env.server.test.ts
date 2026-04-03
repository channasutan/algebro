import { describe, it, expect, vi, afterEach } from "vitest";
import { getFreeHintLimit } from "../../../config/env.server";

const INVALID_FORMAT_MSG = (val: string) =>
  `Invalid FREE_HINT_LIMIT value: "${val}". Must be a positive integer string (e.g. "5").`;

const BELOW_MIN_MSG = (val: string) =>
  `Invalid FREE_HINT_LIMIT value: "${val}". Must be >= 1.`;

describe("getFreeHintLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // --- Valid cases ---

  it("returns 3 when FREE_HINT_LIMIT is not set", () => {
    delete process.env.FREE_HINT_LIMIT;
    expect(getFreeHintLimit()).toBe(3);
  });

  it.each([
    ["5", 5],
    ["1", 1],
  ])("returns %i when FREE_HINT_LIMIT is '%s'", (raw, expected) => {
    vi.stubEnv("FREE_HINT_LIMIT", raw);
    expect(getFreeHintLimit()).toBe(expected);
  });

  // --- Invalid format (non-integer strings) ---

  it.each([
    ["abc"],
    ["-1"],
    ["3.5"],
    ["3.0"],
    [" 3"],
    ["3abc"],
  ])("throws format error when FREE_HINT_LIMIT is '%s'", (raw) => {
    vi.stubEnv("FREE_HINT_LIMIT", raw);
    expect(() => getFreeHintLimit()).toThrowError(INVALID_FORMAT_MSG(raw));
  });

  // --- Below minimum (valid integer but out of range) ---

  it("throws range error when FREE_HINT_LIMIT is '0'", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "0");
    expect(() => getFreeHintLimit()).toThrowError(BELOW_MIN_MSG("0"));
  });
});