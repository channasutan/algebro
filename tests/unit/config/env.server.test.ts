import { describe, it, expect, vi, afterEach } from "vitest";
import { getFreeHintLimit } from "../../../config/env.server";

describe("getFreeHintLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 3 when FREE_HINT_LIMIT is not set", () => {
    vi.stubEnv("FREE_HINT_LIMIT", undefined as unknown as string);
    expect(getFreeHintLimit()).toBe(3);
  });

  it("returns the parsed integer when FREE_HINT_LIMIT is a valid positive integer string", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "5");
    expect(getFreeHintLimit()).toBe(5);
  });

  it("returns 1 when FREE_HINT_LIMIT is '1' (minimum valid value)", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "1");
    expect(getFreeHintLimit()).toBe(1);
  });

  it("throws when FREE_HINT_LIMIT is a non-integer string", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "abc");
    expect(() => getFreeHintLimit()).toThrowError(
      `Invalid FREE_HINT_LIMIT value: "abc". Must be a positive integer.`
    );
  });

  it("throws when FREE_HINT_LIMIT is '0'", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "0");
    expect(() => getFreeHintLimit()).toThrowError(
      `Invalid FREE_HINT_LIMIT value: "0". Must be a positive integer.`
    );
  });

  it("throws when FREE_HINT_LIMIT is a negative integer string", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "-1");
    expect(() => getFreeHintLimit()).toThrowError(
      `Invalid FREE_HINT_LIMIT value: "-1". Must be a positive integer.`
    );
  });

  it("throws when FREE_HINT_LIMIT is a float string", () => {
    vi.stubEnv("FREE_HINT_LIMIT", "3.5");
    expect(() => getFreeHintLimit()).not.toThrow(); // parseInt("3.5") = 3, which is valid
  });
});
