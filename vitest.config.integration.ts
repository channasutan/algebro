import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync } from "node:fs";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Minimal .env file parser — avoids adding a dotenv dependency.
 * Reads KEY=value pairs, strips quotes, ignores comments and blank lines.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const raw = readFileSync(filePath, "utf8");
    const result: Record<string, string> = {};

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      const rawValue = trimmed.slice(eqIdx + 1).trim();

      // Strip surrounding quotes (single or double)
      const value =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue;

      result[key] = value;
    }

    return result;
  } catch {
    return {};
  }
}

const envVars = parseEnvFile(path.resolve(__dirname, ".env.test"));

export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    env: envVars,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": "server-only",
      "client-only": "client-only",
    },
  },
});