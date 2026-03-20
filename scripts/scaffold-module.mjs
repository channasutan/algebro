#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

/**
 * Convert kebab-case string to PascalCase
 * @param {string} str - kebab-case string
 * @returns {string} PascalCase string
 */
function toPascalCase(str) {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Convert kebab-case string to camelCase
 * @param {string} str - kebab-case string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Parse CLI arguments and return config
 * @returns {{ name: string, pascalName: string, camelName: string, dryRun: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  // Check for help
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scripts/scaffold-module.mjs <module-name> [--dry-run]");
    console.log("");
    console.log("Arguments:");
    console.log("  module-name    Kebab-case module name (e.g., user-profiles)");
    console.log("  --dry-run      Show what would be created without creating files");
    process.exit(0);
  }
  
  // Find module name (first non-flag argument)
  const moduleName = args.find((arg) => !arg.startsWith("-"));
  
  if (!moduleName) {
    console.error("Error: Module name is required");
    console.error("Usage: node scripts/scaffold-module.mjs <module-name> [--dry-run]");
    process.exit(1);
  }
  
  // Validate kebab-case format
  const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (!kebabCaseRegex.test(moduleName)) {
    console.error(`Error: Invalid module name "${moduleName}"`);
    console.error("Module name must be:");
    console.error("  - kebab-case (lowercase with hyphens)");
    console.error("  - Start with a letter");
    console.error("  - Only alphanumeric characters and hyphens");
    console.error("  - Max 30 characters");
    process.exit(1);
  }
  
  if (moduleName.length > 30) {
    console.error(`Error: Module name "${moduleName}" exceeds 30 characters`);
    process.exit(1);
  }
  
  // Check if module already exists
  const modulePath = path.join(process.cwd(), "modules", moduleName);
  if (fs.existsSync(modulePath)) {
    console.error(`Error: Module '${moduleName}' already exists at modules/${moduleName}/`);
    process.exit(1);
  }
  
  // Check dry-run flag
  const dryRun = args.includes("--dry-run");
  
  return {
    name: moduleName,
    pascalName: toPascalCase(moduleName),
    camelName: toCamelCase(moduleName),
    dryRun,
  };
}

/**
 * Module template definition
 * Single source of truth for module structure
 */
const MODULE_TEMPLATE = {
  directories: ["", "contracts", "domain", "services", "repositories", "events", "tests"],
  files: [
    {
      path: "index.ts",
      content: (ctx) => `import type { ExampleInput, ExampleResult } from "./contracts/example";
import { exampleService } from "./services/example";
import { createSupabase${ctx.pascalName}Repository } from "./repositories/supabase-${ctx.name}-repository";

export * from "./contracts";

// Facade: creates repository and calls service with injection
export async function ${ctx.camelName}Example(input: ExampleInput): Promise<ExampleResult> {
  const repo = createSupabase${ctx.pascalName}Repository();
  return exampleService(repo, input);
}

export const ${ctx.camelName}Module = {
  name: "${ctx.name}",
} as const;
`,
    },
    {
      path: "contracts/index.ts",
      content: (_ctx) => `export * from "./example";
`,
    },
    {
      path: "contracts/example.ts",
      content: (_ctx) => `export type ExampleInput = {
  // TODO: Define input fields
};

export type ExampleResult = {
  // TODO: Define result fields
};
`,
    },
    {
      path: "domain/entities.ts",
      content: (_ctx) => `// Optional domain entities
// Define your domain models here
`,
    },
    {
      path: "services/example.ts",
      content: (ctx) => `import type { ExampleInput, ExampleResult } from "../contracts";
import type { ${ctx.pascalName}Repository } from "../repositories/${ctx.name}-repository";

// Services orchestrate business logic, delegate persistence to repository
export async function exampleService(
  repo: ${ctx.pascalName}Repository,
  input: ExampleInput
): Promise<ExampleResult> {
  // TODO: Implement service logic
  // Use repo for data access (do not import supabase here)
  throw new Error("Not implemented");
}
`,
    },
    {
      path: "repositories/${name}-repository.ts",
      content: (ctx) => `// Define repository contract here
export interface ${ctx.pascalName}Repository {
  // TODO: Add repository methods
}
`,
    },
    {
      path: "repositories/supabase-${name}-repository.ts",
      content: (ctx) => `import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { ${ctx.pascalName}Repository } from "./${ctx.name}-repository";

export function createSupabase${ctx.pascalName}Repository(): ${ctx.pascalName}Repository {
  // Each method calls getSupabaseServerClient() internally for request-scoped client
  return {
    async exampleMethod() {
      const client = getSupabaseServerClient();
      // TODO: Implement using client
    }
  };
}
`,
    },
    {
      path: "events/index.ts",
      content: (ctx) => `export function register${ctx.pascalName}EventHandlers(): void {
  // TODO: Register event handlers here
  // Called from modules/bootstrap.ts
  // Example: eventBus.subscribe(EVENT_NAME, handler)
}
`,
    },
    {
      path: "tests/example.test.ts",
      content: (ctx) => `import { describe, it, expect } from "vitest";
import { exampleService } from "../services/example";

describe("${ctx.pascalName}", () => {
  it("should pass placeholder test", () => {
    expect(true).toBe(true);
  });
});
`,
    },
  ],
};

/**
 * Render module template to filesystem
 * @param {{ name: string, pascalName: string, camelName: string, dryRun: boolean }} config
 * @param {object} template
 * @returns {string[]} Array of created file paths
 */
function renderModule(config, template) {
  const basePath = path.join(process.cwd(), "modules", config.name);
  const wrap = { ...config, template };

  renderDirectories(wrap, basePath);
  return renderFiles(wrap, basePath);
}

function renderDirectories(wrap, basePath) {
  const { name, dryRun } = wrap;
  const { directories } = wrap.template;

  for (const dir of directories) {
    const dirPath = dir ? path.join(basePath, dir) : basePath;
    const displayPath = `modules/${name}${dir ? "/" + dir : ""}`;

    if (dryRun) {
      logDryRun("directory", displayPath);
      continue;
    }

    ensureDirectory(dirPath);
    logCreated("directory", displayPath);
  }
}

function renderFiles(wrap, basePath) {
  const { name, dryRun } = wrap;
  const { files } = wrap.template;
  const createdPaths = [];

  for (const file of files) {
    const filePath = file.path.replaceAll("${name}", name);
    const fullPath = path.join(basePath, filePath);
    const content = file.content(wrap);
    const displayPath = `modules/${name}/${filePath}`;

    if (dryRun) {
      logDryRun("file", displayPath);
      createdPaths.push(fullPath);
      continue;
    }

    writeFile(fullPath, content);
    logCreated("file", displayPath);
    createdPaths.push(fullPath);
  }

  return createdPaths;
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(fullPath, content) {
  fs.writeFileSync(fullPath, content, "utf-8");
}

function logDryRun(type, displayPath) {
  console.log(`[DRY-RUN] Would create ${type}: ${displayPath}`);
}

function logCreated(type, displayPath) {
  console.log(`[CREATED] ${type.charAt(0).toUpperCase() + type.slice(1)}: ${displayPath}`);
}

/**
 * Main execution flow
 */
function main() {
  try {
    // Parse arguments
    const config = parseArgs();

    // Render template
    const createdPaths = renderModule(config, MODULE_TEMPLATE);

    // Print success output
    console.log("");
    console.log(`[OK] Module created: modules/${config.name}`);
    console.log("");
    console.log(`[OK] Created ${createdPaths.length} items (files and directories)`);
    console.log("[OK] Structure: contracts, domain, services, repositories, events, tests");
    console.log("");
    console.log(`[OK] Next step: Add register${config.pascalName}EventHandlers() to modules/bootstrap.ts`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run main
main();
