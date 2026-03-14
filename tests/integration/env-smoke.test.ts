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
      if (value === undefined) {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); // Use empty to trigger validation in stubEnv or just stub with empty
        // Actually, Vitest stubEnv doesn't allow undefined easily for "missing", 
        // so we'll stub with empty string to trigger the "Missing" error in the implementation.
      } else {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", value);
      }
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      vi.resetModules();
      // env.public.ts validates at module level, so import() will reject
      await expect(import("@/config/env.public")).rejects.toThrow(/Missing required public environment variable: NEXT_PUBLIC_SUPABASE_URL/);
    });

    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["whitespace", "   "]
    ])("throws error when NEXT_PUBLIC_SUPABASE_ANON_KEY is %s", async (_, value) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      if (value === undefined) {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      } else {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", value);
      }
      
      vi.resetModules();
      await expect(import("@/config/env.public")).rejects.toThrow(/Missing required public environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/);
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
      const { getInfrastructureServerEnv } = await import("@/config/env.server");
      
      const env = getInfrastructureServerEnv();
      expect(env.supabaseUrl).toBe("http://localhost:54321");
      expect(env.supabaseServiceRoleKey).toBe("test-service-role-key");
      expect(env.aiProviderApiKey).toBe("test-ai-provider-key");
      expect(env.mayarApiKey).toBe("test-mayar-key");
    });

    it.each([
      ["SUPABASE_SERVICE_ROLE_KEY", "required for admin database access"],
      ["AI_PROVIDER_API_KEY", "required for AI service"],
      ["MAYAR_API_KEY", "required for payment service"]
    ])("throws error when %s is missing", async (key, description) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      // Stub others as valid
      ["SUPABASE_SERVICE_ROLE_KEY", "AI_PROVIDER_API_KEY", "MAYAR_API_KEY", "MAYAR_WEBHOOK_SECRET"].forEach(k => {
        if (k !== key) vi.stubEnv(k, "valid-value");
      });
      
      vi.stubEnv(key, ""); // Empty string to trigger validation in env.server.ts
      
      vi.resetModules();
      const { getInfrastructureServerEnv } = await import("@/config/env.server");
      
      expect(() => getInfrastructureServerEnv()).toThrow(new RegExp(String.raw`Missing required environment variable: ${key} \(${description}\)`));
    });
  });

  describe("getServerEnv", () => {
    it("returns server environment when public variables are valid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      vi.resetModules();
      const { getServerEnv } = await import("@/config/env.server");
      
      const env = getServerEnv();
      expect(env.supabaseUrl).toBe("http://localhost:54321");
      expect(env.supabaseAnonKey).toBe("test-anon-key");
    });

    it("throws error when required public variables are invalid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   "); // whitespace
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
      
      vi.resetModules();
      const { getServerEnv } = await import("@/config/env.server");
      
      // Note: server-side getPublicEnv in env.server.ts uses a different template than env.public.ts
      expect(() => getServerEnv()).toThrow(/Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/);
    });
  });
});
