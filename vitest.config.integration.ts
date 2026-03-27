import { fileURLToPath } from "node:url";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.test into process.env before Vitest reads test.env
loadDotenv({ path: path.resolve(__dirname, ".env.test"), override: false });

export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ?? "",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      TEST_USER_A_EMAIL: process.env.TEST_USER_A_EMAIL ?? "",
      TEST_USER_A_PASSWORD: process.env.TEST_USER_A_PASSWORD ?? "",
      TEST_USER_B_EMAIL: process.env.TEST_USER_B_EMAIL ?? "",
      TEST_USER_B_PASSWORD: process.env.TEST_USER_B_PASSWORD ?? "",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": "server-only",
      "client-only": "client-only",
    },
  },
});