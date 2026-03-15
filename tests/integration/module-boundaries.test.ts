import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourceRoots = ["app", "events", "infrastructure", "jobs", "lib", "modules"];
const disallowedProcessEnvRoots = ["app", "modules"];

function collectFiles(directory: string): string[] {
  const absoluteDirectory = path.join(repoRoot, directory);

  if (!fs.existsSync(absoluteDirectory)) {
    return [];
  }

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const absoluteEntryPath = path.join(absoluteDirectory, entry.name);
    const relativeEntryPath = path.relative(repoRoot, absoluteEntryPath);

    if (entry.isDirectory()) {
      return collectFiles(relativeEntryPath);
    }

    if (!shouldIncludeFile(entry)) {
      return [];
    }

    return [absoluteEntryPath];
  });
}

function shouldIncludeFile(entry: fs.Dirent): boolean {
  if (!entry.isFile()) {
    return false;
  }

  return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx");
}

function toRepoRelativePath(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function isRepositoryFile(relativePath: string): boolean {
  return /^modules\/[^/]+\/repositories\/.+\.(ts|tsx)$/.test(relativePath);
}

function findSupabaseImports(source: string): string[] {
  return source.match(
    /(?:^|\n)\s*import(?:[\s\S]*?)["']@\/lib\/supabase\/[^"']+["'];?/g
  ) ?? [];
}

describe("module boundaries", () => {
  it("limits lib/supabase imports to repository files only", () => {
    const violations = sourceRoots.flatMap((directory) =>
      collectFiles(directory).flatMap((absolutePath) => {
        const relativePath = toRepoRelativePath(absolutePath);

        if (relativePath.startsWith("lib/supabase/")) {
          return [];
        }

        const source = fs.readFileSync(absolutePath, "utf8");
        const imports = findSupabaseImports(source);

        if (imports.length === 0 || isRepositoryFile(relativePath)) {
          return [];
        }

        return [`${relativePath}: ${imports.join(" | ")}`];
      })
    );

    expect(violations).toEqual([]);
  });

  it("does not read raw process.env in app routes, server actions, or module code", () => {
    const violations = disallowedProcessEnvRoots.flatMap((directory) =>
      collectFiles(directory).flatMap((absolutePath) => {
        const relativePath = toRepoRelativePath(absolutePath);
        const source = fs.readFileSync(absolutePath, "utf8");

        if (!source.includes("process.env")) {
          return [];
        }

        return [relativePath];
      })
    );

    expect(violations).toEqual([]);
  });

  it("documents the repository-only Supabase rule in architecture.yml", () => {
    const architectureRules = fs.readFileSync(path.join(repoRoot, "architecture.yml"), "utf8");

    expect(architectureRules).toContain('constraint: "app -> supabase-clients"');
    expect(architectureRules).toContain(
      'constraint: "module-non-repositories -> supabase-clients"'
    );
    expect(architectureRules).toContain('constraint: "infrastructure -> supabase-clients"');
    expect(architectureRules).toContain('constraint: "jobs -> supabase-clients"');
    expect(architectureRules).toContain('constraint: "events -> supabase-clients"');
  });
});
