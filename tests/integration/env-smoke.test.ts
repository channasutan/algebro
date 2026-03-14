import { afterEach, describe, expect, it, vi } from "vitest";

describe("environment smoke tests", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("getPublicEnv", () => {
    it("returns public environment when all required variables are valid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("NODE_ENV", "test");
      
      vi.resetModules();
      const { getPublicEnv } = await import("@/config/env.public");
      
      const env = getPublicEnv();
      expect(env.supabaseUrl).toBe("http://localhost:54321");
      expect(env.supabaseAnonKey).toBe("test-anon-key");
      expect(env.nodeEnv).toBe("test");
    });

    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["whitespace", "   "]
    ])("throws error when NEXT_PUBLIC_SUPABASE_URL is %s", async (_, value) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      if (value === undefined) {
        const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
        let error: unknown;
        try {
          delete process.env.NEXT_PUBLIC_SUPABASE_URL;
          vi.resetModules();
          await import("@/config/env.public");
        } catch (e) {
          error = e;
        } finally {
          if (original === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_URL = original;
          }
        }
        expect(error).toBeInstanceOf(Error);
        expect(String(error)).toMatch(/Missing required public environment variable: NEXT_PUBLIC_SUPABASE_URL/);
      } else {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", value);
        vi.resetModules();
        let error: unknown;
        try {
          await import("@/config/env.public");
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
        expect(String(error)).toMatch(/Missing required public environment variable: NEXT_PUBLIC_SUPABASE_URL/);
      }
    });

    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["whitespace", "   "]
    ])("throws error when NEXT_PUBLIC_SUPABASE_ANON_KEY is %s", async (_, value) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      
      if (value === undefined) {
        const original = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        let error: unknown;
        try {
          delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          vi.resetModules();
          await import("@/config/env.public");
        } catch (e) {
          error = e;
        } finally {
          if (original === undefined) {
            delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          } else {
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = original;
          }
        }
        expect(error).toBeInstanceOf(Error);
        expect(String(error)).toMatch(/Missing required public environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/);
      } else {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", value);
        vi.resetModules();
        let error: unknown;
        try {
          await import("@/config/env.public");
        } catch (e) {
          error = e;
        }
        expect(error).toBeInstanceOf(Error);
        expect(String(error)).toMatch(/Missing required public environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/);
      }
    });
  });

  describe("getInfrastructureServerEnv", () => {
    it("returns infrastructure environment when all required variables are valid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
      vi.stubEnv("AI_PROVIDER_API_KEY", "test-ai-provider-key");
      vi.stubEnv("MAYAR_API_KEY", "test-mayar-key");
      vi.stubEnv("MAYAR_WEBHOOK_SECRET", "test-webhook-secret");
      
      vi.resetModules();
      const { getInfrastructureServerEnv } = await import("@/config/env.server-entry");
      
      const env = getInfrastructureServerEnv();
      expect(env.supabaseUrl).toBe("http://localhost:54321");
      expect(env.supabaseServiceRoleKey).toBe("test-service-role-key");
      expect(env.aiProviderApiKey).toBe("test-ai-provider-key");
      expect(env.mayarApiKey).toBe("test-mayar-key");
    });

    it.each([
      ["SUPABASE_SERVICE_ROLE_KEY", "required for admin database access"],
      ["AI_PROVIDER_API_KEY", "required for AI service"],
      ["MAYAR_API_KEY", "required for payment service"],
      ["MAYAR_WEBHOOK_SECRET", "required for payment webhooks"]
    ])("throws error when %s is missing", async (key, description) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      // Stub others as valid
      ["SUPABASE_SERVICE_ROLE_KEY", "AI_PROVIDER_API_KEY", "MAYAR_API_KEY", "MAYAR_WEBHOOK_SECRET"].forEach(k => {
        if (k !== key) vi.stubEnv(k, "valid-value");
      });
      
      const original = process.env[key];
      try {
        delete process.env[key];
        vi.resetModules();
        const { getInfrastructureServerEnv } = await import("@/config/env.server-entry");
        
        expect(() => getInfrastructureServerEnv()).toThrow(new RegExp(String.raw`Missing required environment variable: ${key} \(${description}\)`));
      } finally {
        if (original === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = original;
        }
      }
    });
  });

  describe("getServerEnv", () => {
    it("returns server environment when public variables are valid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      vi.resetModules();
      const { getServerEnv } = await import("@/config/env.server-entry");
      
      const env = getServerEnv();
      expect(env.supabaseUrl).toBe("http://localhost:54321");
      expect(env.supabaseAnonKey).toBe("test-anon-key");
    });

    it("throws error when required public variables are invalid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   "); // whitespace
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      vi.resetModules();
      const { getServerEnv } = await import("@/config/env.server-entry");
      
      // Note: server-side getPublicEnv in env.server.ts uses a different template than env.public.ts
      expect(() => getServerEnv()).toThrow(/Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/);
    });
  });
});
