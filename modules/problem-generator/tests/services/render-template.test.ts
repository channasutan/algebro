import { describe, it, expect } from "vitest";
import { renderTemplate, RenderError } from "../../services/render-template";

describe("renderTemplate", () => {
  it("substitutes $param syntax", () => {
    const result = renderTemplate("$a*x + $b = $c", { a: 3, b: 7, c: 15 });
    expect(result).toBe("3*x + 7 = 15");
  });

  it("substitutes ${param} syntax", () => {
    const result = renderTemplate("${a}*x + ${b} = ${c}", { a: 3, b: 7, c: 15 });
    expect(result).toBe("3*x + 7 = 15");
  });

  it("handles mixed syntax", () => {
    const result = renderTemplate("$a*x + ${b} = $c", { a: 3, b: 7, c: 15 });
    expect(result).toBe("3*x + 7 = 15");
  });

  it("replaces multiple occurrences of same parameter", () => {
    const result = renderTemplate("$a*x + $a = $b", { a: 5, b: 10 });
    expect(result).toBe("5*x + 5 = 10");
  });

  it("handles negative numbers", () => {
    const result = renderTemplate("$a*x + $b = $c", { a: -3, b: -7, c: -15 });
    expect(result).toBe("-3*x + -7 = -15");
  });

  it("returns template unchanged when no parameters needed", () => {
    const template = "2*x + 4 = 10";
    const result = renderTemplate(template, {});
    expect(result).toBe(template);
  });

  it("throws when parameter is missing", () => {
    expect(() => renderTemplate("$a*x + $b = $c", { a: 3 })).toThrow(RenderError);
    expect(() => renderTemplate("$a*x + $b = $c", { a: 3 })).toThrow("Unresolved placeholders");
  });

  it("throws on empty template", () => {
    expect(() => renderTemplate("", { a: 3 })).toThrow(RenderError);
    expect(() => renderTemplate("", { a: 3 })).toThrow("Template cannot be empty");
  });

  it("throws when no parameters provided but placeholders exist", () => {
    expect(() => renderTemplate("$a*x + 4 = 10", {})).toThrow(RenderError);
    expect(() => renderTemplate("$a*x + 4 = 10", {})).toThrow("no parameters provided");
  });

  it("handles partial substitution correctly", () => {
    const result = renderTemplate("$a*x + 4 = 10", { a: 3 });
    expect(result).toBe("3*x + 4 = 10");
  });

  it("does not substitute partial parameter names", () => {
    // $ab should not be matched when looking for $a
    const result = renderTemplate("$ab + $a = 10", { a: 3, ab: 5 });
    expect(result).toBe("5 + 3 = 10");
  });

  it("handles complex templates", () => {
    const template = "\\frac{$a}{$b}x^2 + ${c}x + $d = 0";
    const result = renderTemplate(template, { a: 1, b: 2, c: 3, d: 4 });
    expect(result).toBe("\\frac{1}{2}x^2 + 3x + 4 = 0");
  });

  it("handles zero values", () => {
    const result = renderTemplate("$a*x + $b = $c", { a: 0, b: 0, c: 0 });
    expect(result).toBe("0*x + 0 = 0");
  });
});

describe("RenderError", () => {
  it("has correct name and message", () => {
    const error = new RenderError("Test error");
    expect(error.name).toBe("RenderError");
    expect(error.message).toContain("[render-template]");
    expect(error.message).toContain("Test error");
  });
});
