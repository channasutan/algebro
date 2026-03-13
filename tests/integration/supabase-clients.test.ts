import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

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
    // Save original values
    originalEnv.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    originalEnv.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    // Restore original values
    if (originalEnv.NEXT_PUBLIC_SUPABASE_URL !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    if (originalEnv.SUPABASE_SERVICE_ROLE_KEY !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();

    await expect(async () => {
      await import("@/config/env.public");
    }).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.resetModules();

    await expect(async () => {
      await import("@/config/env.public");
    }).rejects.toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    await expect(async () => {
      await import("@/config/env.server-entry");
    }).rejects.toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("env configuration - positive cases", () => {
  it("getPublicEnv returns correct values", async () => {
    const { getPublicEnv } = await import("@/config/env.public");
    const env = getPublicEnv();

    expect(env.supabaseUrl).toBe("https://test.supabase.co");
    expect(env.supabaseAnonKey).toBe("test-anon-key");
    expect(env.nodeEnv).toBe("test");
  });

  it("server-entry exports getSupabaseServiceRoleKey", async () => {
    const { getSupabaseServiceRoleKey } = await import("@/config/env.server-entry");
    expect(typeof getSupabaseServiceRoleKey).toBe("function");
    expect(getSupabaseServiceRoleKey()).toBe("test-service-role-key");
  });
});
