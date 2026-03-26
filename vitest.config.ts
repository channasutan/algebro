import { fileURLToPath } from "node:url";
import path from "node:path";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "modules/**/*.test.ts",
      "jobs/**/*.test.ts"
    ],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage"
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
      "client-only": path.resolve(__dirname, "tests/mocks/client-only.ts")
    }
  }
});
