import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { evaluateMock } = vi.hoisted(() => ({
  evaluateMock: vi.fn()
}));

vi.mock("@/lib/math/sympy-client", () => ({
  sympyClient: {
    evaluate: evaluateMock
  }
}));

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

import { MathParseError } from "@/lib/math/errors";
import { toLatexString, type LatexString } from "@/lib/math/types";
import { canonicalize } from "../services/canonicalize";
import { classifyStep } from "../services/classify-step";
import { detectErrorType } from "../services/detect-error-type";
import { validateStep } from "../services/validate-step";

const context = { requestId: "test-req" };

// Shared path constants for import boundary tests
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);
const servicesDir = path.join(
  repoRoot,
  "modules",
  "step-validation",
  "services"
);

describe("canonicalize", () => {
  it("returns canonical form of a valid expression", () => {
    const result = canonicalize("2x+6");
    expect(result).toBe("2x+6");
  });

  it("is deterministic for supported inputs", () => {
    expect(canonicalize("2(x+3)")).toBe(canonicalize("2(x+3)"));
  });

  it("throws a typed parse error for invalid input", () => {
    expect(() => canonicalize(String.raw`\frac{1}`)).toThrow(MathParseError);
  });
});

describe("classifyStep", () => {
  it("classifies calculus operations", () => {
    expect(classifyStep({ previousLatex: "x^2", currentLatex: String.raw`\int x^2 dx` })).toBe("calculus_operation");
  });

  it("classifies equation operations", () => {
    expect(classifyStep({ previousLatex: "7x", currentLatex: "7x=28" })).toBe("equation_operation");
  });

  it("classifies substitution from step text", () => {
    expect(classifyStep({ previousLatex: "x", currentLatex: "x", stepText: "Let x = 0" })).toBe("substitution");
  });

  it("classifies assumption from step text", () => {
    expect(classifyStep({ previousLatex: "a", currentLatex: "b", stepText: "Assume f(a)=f(b)" })).toBe("assumption");
  });

  it("classifies logical reasoning from step text", () => {
    expect(classifyStep({ previousLatex: "a", currentLatex: "b", stepText: "Therefore a = b" })).toBe("logical_reasoning");
  });

  it("falls back to symbolic_transformation", () => {
    expect(classifyStep({ previousLatex: "2x+4", currentLatex: "2x+6" })).toBe("symbolic_transformation");
  });
});

describe("detectErrorType", () => {
  it("detects sign_error", () => {
    expect(detectErrorType({ previousLatex: "2x+6", currentLatex: "-2x-6" })).toBe("sign_error");
  });

  it("detects incorrect_distribution", () => {
    expect(detectErrorType({ previousLatex: "2(x+3)", currentLatex: "2x+3" })).toBe("incorrect_distribution");
  });

  it("falls back to non_equivalent_transformation", () => {
    expect(detectErrorType({ previousLatex: "2x+4", currentLatex: "3x+1" })).toBe("non_equivalent_transformation");
  });
});

describe("validateStep", () => {
  beforeEach(() => {
    evaluateMock.mockReset();
  });

  it("returns isValid true for equivalent algebraic transformations", async () => {
    const result = await validateStep({ previousLatex: "2(x+3)", currentLatex: "2x+6" }, context);
    expect(result).toEqual({
      isValid: true,
      errorType: null,
      stepType: "symbolic_transformation"
    });
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("returns symbolic classification for non-equivalent transformations", async () => {
    const result = await validateStep({ previousLatex: "2x+4", currentLatex: "2x+6" }, context);
    expect(result).toEqual({
      isValid: false,
      errorType: "non_equivalent_transformation",
      stepType: "symbolic_transformation"
    });
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("keeps sign error detection semantics", async () => {
    const result = await validateStep({ previousLatex: "2x+6", currentLatex: "-2x-6" }, context);
    expect(result).toEqual({
      isValid: false,
      errorType: "sign_error",
      stepType: "symbolic_transformation"
    });
  });

  it("falls back to SymPy true when Cortex parsing fails", async () => {
    evaluateMock.mockResolvedValueOnce({ result: true });

    const result = await validateStep({ previousLatex: String.raw`\frac{1`, currentLatex: "2x+6" }, context);

    expect(result).toEqual({
      isValid: true,
      errorType: null,
      stepType: "symbolic_transformation"
    });
  });

  it("falls back to SymPy false as non-equivalent when cortex failed", async () => {
    evaluateMock.mockResolvedValueOnce({ result: false });

    const result = await validateStep({ previousLatex: String.raw`\frac{1`, currentLatex: "2x+6" }, context);

    expect(result).toEqual({
      isValid: false,
      errorType: "parse_error",
      stepType: "symbolic_transformation"
    });
  });

  it("returns parse_error when both Cortex and SymPy fail", async () => {
    evaluateMock.mockRejectedValueOnce(new Error("sympy-fail"));

    const result = await validateStep({ previousLatex: String.raw`\frac{1`, currentLatex: "2x+6" }, context);

    expect(result).toEqual({
      isValid: false,
      errorType: "parse_error",
      stepType: null
    });
  });
});

describe("import boundaries", () => {
  it("keeps @cortex-js/compute-engine import only in lib math adapter", () => {
    const allowedImporter = "lib/math/cortex-compute-engine.ts";

    // Limit scan to known relevant source roots only
    const libDir = path.join(repoRoot, "lib");
    const stepValidationDir = path.join(repoRoot, "modules", "step-validation");
    const allTsFiles = [
      ...collectTypeScriptFiles(libDir),
      ...collectTypeScriptFiles(stepValidationDir),
    ];

    const importers = allTsFiles.filter((absolutePath) => {
      const source = fs.readFileSync(absolutePath, "utf8");
      return importsModule(source, "@cortex-js/compute-engine");
    });

    const relativeImporters = importers
      .map((absolutePath) => path.relative(repoRoot, absolutePath).split(path.sep).join("/"))
      .sort(); // NOSONAR — sorting file paths for deterministic assertion; alphabetical is correct here

    expect(relativeImporters).toEqual([allowedImporter]);
  });

  it("does not import @cortex-js/compute-engine in service layer", () => {
    const serviceFiles = collectTypeScriptFiles(servicesDir);

    const violatingFiles = serviceFiles.filter((absolutePath) => {
      const source = fs.readFileSync(absolutePath, "utf8");
      return importsModule(source, "@cortex-js/compute-engine");
    });

    expect(violatingFiles).toEqual([]);
  });

  it("does not import infrastructure in step-validation services", () => {
    const serviceFiles = collectTypeScriptFiles(servicesDir);

    const violatingFiles = serviceFiles.filter((absolutePath) => {
      const source = fs.readFileSync(absolutePath, "utf8");
      return importsModule(source, "@/infrastructure/");
    });

    expect(violatingFiles).toEqual([]);
  });
});

/**
 * Checks if a source file contains an import statement for a given module.
 * Uses simple line-by-line scanning without regex to avoid ReDoS risks.
 */
function importsModule(source: string, moduleName: string): boolean {
  const lines = source.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if line starts with import and contains the module name
    if (trimmed.startsWith("import ") && trimmed.includes(moduleName)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a directory should be ignored during recursive traversal.
 */
const IGNORED_DIRECTORIES = new Set(["node_modules", ".next", "dist", ".git", "coverage"]);

function isIgnoredDirectory(name: string): boolean {
  return IGNORED_DIRECTORIES.has(name);
}

/**
 * Checks if a file is a TypeScript source file (.ts or .tsx).
 */
function isTypeScriptSourceFile(name: string): boolean {
  const ext = path.extname(name);
  return ext === ".ts" || ext === ".tsx";
}

/**
 * Checks if a directory entry should be descended into.
 */
function shouldDescendInto(entry: fs.Dirent): boolean {
  return entry.isDirectory() && !isIgnoredDirectory(entry.name);
}

/**
 * Collects all TypeScript (.ts and .tsx) files recursively from a directory.
 * Excludes common build/output directories.
 */
function collectTypeScriptFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });

  const results: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (shouldDescendInto(entry)) {
      // Recurse into subdirectories that are not ignored
      results.push(...collectTypeScriptFiles(entryPath));
    } else if (entry.isFile() && isTypeScriptSourceFile(entry.name)) {
      results.push(entryPath);
    }
  }

  return results;
}

describe("LatexString type guard", () => {
  it("isLatexString returns true for LatexString", () => {
    const latex = toLatexString("x + 1");
    expect(latex).toBe("x + 1");
  });

  // @ts-expect-error — plain string not assignable to LatexString
  const _bad: LatexString = "x + 1";
});
