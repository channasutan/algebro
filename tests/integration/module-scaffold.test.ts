import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const TEST_MODULE_NAME = `test-scaffold-${randomUUID()}`;
const MODULES_DIR = path.join(process.cwd(), "modules");
const TEST_MODULE_PATH = path.join(MODULES_DIR, TEST_MODULE_NAME);

describe("Module Scaffold", () => {
  beforeAll(() => {
    // Ensure test module doesn't exist before running scaffold
    if (fs.existsSync(TEST_MODULE_PATH)) {
      fs.rmSync(TEST_MODULE_PATH, { recursive: true, force: true });
    }
    // Run scaffold command once for all tests
    execFileSync(process.execPath, ["scripts/scaffold-module.mjs", TEST_MODULE_NAME], {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
  });

  afterAll(() => {
    // Cleanup: remove test module after all tests complete
    if (fs.existsSync(TEST_MODULE_PATH)) {
      fs.rmSync(TEST_MODULE_PATH, { recursive: true, force: true });
    }
  });

  it("generates all required directories", () => {
    // Assert all directories exist
    expect(fs.existsSync(path.join(TEST_MODULE_PATH))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "contracts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "domain"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "services"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "repositories"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "events"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "tests"))).toBe(true);
  });

  it("generates all required files", () => {
    // Assert all files exist
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "contracts", "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "contracts", "example.ts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "domain", "entities.ts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "services", "example.ts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "repositories", `${TEST_MODULE_NAME}-repository.ts`))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "repositories", `supabase-${TEST_MODULE_NAME}-repository.ts`))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "events", "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(TEST_MODULE_PATH, "tests", "example.test.ts"))).toBe(true);
  });

  it("enforces contract split pattern", () => {
    // Assert contracts/index.ts exists (re-export pattern)
    const contractsIndexPath = path.join(TEST_MODULE_PATH, "contracts", "index.ts");
    expect(fs.existsSync(contractsIndexPath)).toBe(true);

    // Assert contracts/example.ts exists (use-case split)
    const contractsExamplePath = path.join(TEST_MODULE_PATH, "contracts", "example.ts");
    expect(fs.existsSync(contractsExamplePath)).toBe(true);

    // Assert contracts/index.ts re-exports from split files
    const contractsIndexContent = fs.readFileSync(contractsIndexPath, "utf-8");
    expect(contractsIndexContent).toMatch(/export \* from/);
  });

  it("enforces no-supabase-in-services rule", () => {
    const serviceContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "services", "example.ts"),
      "utf-8"
    );

    // Assert no supabase import in services
    expect(serviceContent).not.toContain("@/lib/supabase");
    expect(serviceContent).not.toContain("getSupabaseServerClient");
    expect(serviceContent).not.toContain("getSupabaseBrowserClient");
    expect(serviceContent).not.toContain("getSupabaseAdminClient");
  });

  it("enforces supabase-only-in-repositories rule", () => {
    const repoImplContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "repositories", `supabase-${TEST_MODULE_NAME}-repository.ts`),
      "utf-8"
    );

    // Assert supabase import exists in repository implementation
    expect(repoImplContent).toContain("@/lib/supabase/server-client");
    expect(repoImplContent).toContain("getSupabaseServerClient");
  });

  it("index.ts exports contracts via star export", () => {
    const indexContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "index.ts"),
      "utf-8"
    );

    // Assert exports contracts via star export
    expect(indexContent).toContain('export * from "./contracts"');
  });

  it("index.ts does not expose internal layers directly", () => {
    const indexContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "index.ts"),
      "utf-8"
    );

    // Assert index.ts does not expose internal paths
    expect(indexContent).not.toContain('../services/');
    expect(indexContent).not.toContain('../repositories/');
    expect(indexContent).not.toContain('../domain/');
    expect(indexContent).not.toContain('../events/');
  });

  it("index.ts imports repository factory correctly", () => {
    const indexContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "index.ts"),
      "utf-8"
    );

    // Convert to PascalCase for expected import path
    const pascalName = TEST_MODULE_NAME
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    // Assert index.ts imports repository factory
    expect(indexContent).toContain(`"./repositories/supabase-${TEST_MODULE_NAME}-repository"`);

    // Assert index.ts does NOT import supabase directly
    expect(indexContent).not.toContain("@/lib/supabase");
    expect(indexContent).not.toContain("getSupabaseServerClient");
    expect(indexContent).not.toContain("getSupabaseBrowserClient");
    expect(indexContent).not.toContain("getSupabaseAdminClient");
  });

  it("index.ts exports public services", () => {
    const indexContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "index.ts"),
      "utf-8"
    );

    // Assert exports services
    expect(indexContent).toContain("export { exampleService }");

    // Assert has module metadata
    expect(indexContent).toContain("as const");
  });

  it("event registration placeholder exists", () => {
    const eventsContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "events", "index.ts"),
      "utf-8"
    );

    // Convert test-module-name to PascalCase for function name
    const pascalName = TEST_MODULE_NAME
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    // Assert event registration function exists
    expect(eventsContent).toContain(`register${pascalName}EventHandlers`);
    expect(eventsContent).toContain("export function");
  });

  it("repository factory has correct naming", () => {
    const repoImplContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "repositories", `supabase-${TEST_MODULE_NAME}-repository.ts`),
      "utf-8"
    );

    // Convert test-module-name to PascalCase
    const pascalName = TEST_MODULE_NAME
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    // Assert factory function exists with correct name
    expect(repoImplContent).toContain(`createSupabase${pascalName}Repository`);

    // Assert return type is correct
    expect(repoImplContent).toContain(`: ${pascalName}Repository`);

    // Assert interface file exists
    const repoInterfaceContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "repositories", `${TEST_MODULE_NAME}-repository.ts`),
      "utf-8"
    );
    expect(repoInterfaceContent).toContain(`export interface ${pascalName}Repository`);
  });

  it("enforces cross-module isolation in services", () => {
    const serviceContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "services", "example.ts"),
      "utf-8"
    );

    // Assert services do not import from other modules (relative paths)
    expect(serviceContent).not.toMatch(/from\s+["']\.\.\/other-module/);
    expect(serviceContent).not.toMatch(/.{2}\/.{2}\/modules\//);
    expect(serviceContent).not.toMatch(/from\s+["']\.\.\/\.\.\/modules\//);

    // Assert services do not import from other modules (absolute paths)
    expect(serviceContent).not.toMatch(/from\s+["']@\/modules\//);

    // Assert services only import from within module or shared contracts
    const importMatches = serviceContent.match(/from\s+["']([^"']+)["']/g) || [];
    for (const importStmt of importMatches) {
      // Should not contain paths to other modules
      expect(importStmt).not.toContain("../other");
      expect(importStmt).not.toContain("../../modules/");
      expect(importStmt).not.toContain("@/modules/");
    }
  });

  it("enforces cross-module isolation in repositories", () => {
    const repoImplContent = fs.readFileSync(
      path.join(TEST_MODULE_PATH, "repositories", `supabase-${TEST_MODULE_NAME}-repository.ts`),
      "utf-8"
    );

    // Assert repositories do not import from other modules (relative paths)
    expect(repoImplContent).not.toMatch(/from\s+["']\.\.\/other-module/);
    expect(repoImplContent).not.toMatch(/.{2}\/.{2}\/modules\//);
    expect(repoImplContent).not.toMatch(/from\s+["']\.\.\/\.\.\/modules\//);

    // Assert repositories do not import from other modules (absolute paths)
    expect(repoImplContent).not.toMatch(/from\s+["']@\/modules\//);
  });

  it("fails when module already exists", () => {
    // Module already exists from beforeAll scaffold execution
    expect(() => {
      execFileSync(process.execPath, ["scripts/scaffold-module.mjs", TEST_MODULE_NAME], {
        cwd: process.cwd(),
        encoding: "utf-8",
      });
    }).toThrow();
  });
});
