import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Restores environment variables from saved original values.
 */
function restoreEnv(originalEnv: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

/**
 * Strategy to test missing env at module import time.
 */
async function testAtImport(modulePath: string): Promise<unknown> {
  return import(modulePath);
}

/**
 * Strategy to test missing env when getter is called.
 */
async function testAtCall(
  mod: Record<string, unknown>,
  getterName: string
): Promise<unknown> {
  return (mod[getterName] as () => unknown)();
}

/**
 * Helper to test that missing environment variables throw errors.
 * Uses a strategy function to determine how to trigger the validation.
 */
async function expectMissingEnv(
  envVar: string,
  modulePath: string,
  testFn: (mod: Record<string, unknown>) => Promise<unknown>,
  expectedError: string
): Promise<void> {
  const originalValue = process.env[envVar];
  delete process.env[envVar];
  vi.resetModules();

  const mod = await import(modulePath);
  await expect(testFn(mod)).rejects.toThrow(expectedError);

  // Restore original value
  if (originalValue === undefined) {
    delete process.env[envVar];
  } else {
    process.env[envVar] = originalValue;
  }
  vi.resetModules();
}

describe("supabase clients - boundary safety", () => {
  const clientsDir = path.resolve(process.cwd(), "lib/supabase");

  it("browser-client.ts contains client-only guard", () => {
    const filePath = path.join(clientsDir, "browser-client.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('import "client-only"');
  });

  it("server-client.ts contains server-only guard", () => {
    const filePath = path.join(clientsDir, "server-client.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('import "server-only"');
  });

  it("admin-client.ts contains server-only guard", () => {
    const filePath = path.join(clientsDir, "admin-client.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('import "server-only"');
  });

  it("browser-client.ts does not import server-only env", () => {
    const filePath = path.join(clientsDir, "browser-client.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("@/config/env.server-entry");
  });

  it("server-client.ts does not import service-role key", () => {
    const filePath = path.join(clientsDir, "server-client.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("getSupabaseServiceRoleKey");
  });
});

describe("env configuration - validation", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    originalEnv.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    originalEnv.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    restoreEnv(originalEnv);
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    await expectMissingEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "@/config/env.public",
      testAtImport,
      "NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    await expectMissingEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "@/config/env.public",
      testAtImport,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    await expectMissingEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      "@/config/env.server-entry",
      (mod) => testAtCall(mod, "getSupabaseServiceRoleKey"),
      "SUPABASE_SERVICE_ROLE_KEY"
    );
  });
});

describe("env configuration - positive cases", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("getPublicEnv returns correct values", async () => {
    const { getPublicEnv } = await import("@/config/env.public");
    const env = getPublicEnv();

    expect(env.supabaseUrl).toBe("https://test.supabase.co");
    expect(env.supabaseAnonKey).toBe("test-anon-key");
    expect(env.nodeEnv).toBe("test");
  });

  it("server-entry exports getSupabaseServiceRoleKey", async () => {
    vi.resetModules();
    const { getSupabaseServiceRoleKey } = await import("@/config/env.server-entry");
    expect(typeof getSupabaseServiceRoleKey).toBe("function");
    expect(getSupabaseServiceRoleKey()).toBe("test-service-role-key");
  });
});
