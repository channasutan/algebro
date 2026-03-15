import { afterEach, describe, expect, it, vi } from "vitest";

const validPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key"
} as const;

const validPublicAuthEnv = {
  NEXT_PUBLIC_SITE_URL: "https://algebro.test",
  NEXT_PUBLIC_AUTH_CALLBACK_URL: "https://algebro.test/auth/callback"
} as const;

const validInfrastructureEnv = {
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  AI_PROVIDER_API_KEY: "test-ai-provider-key",
  MAYAR_API_KEY: "test-mayar-key",
  MAYAR_WEBHOOK_SECRET: "test-webhook-secret"
} as const;

function stubEnvGroup(values: Record<string, string>) {
  Object.entries(values).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
}

async function loadPublicEnvModule() {
  vi.resetModules();
  return import("@/config/env.public");
}

async function loadServerEnvModule() {
  vi.resetModules();
  return import("@/config/env.server-entry");
}

async function withDeletedEnv(key: string, run: () => Promise<void> | void) {
  const originalValue = process.env[key];
  delete process.env[key];

  try {
    await run();
  } finally {
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  }
}

describe("environment smoke tests", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("getPublicEnv", () => {
    it("returns public environment when all required variables are valid", async () => {
      stubEnvGroup(validPublicEnv);
      vi.stubEnv("NODE_ENV", "test");

      const { getPublicEnv } = await loadPublicEnvModule();
      const env = getPublicEnv();

      expect(env.supabaseUrl).toBe("http://localhost:54321");
      expect(env.supabaseAnonKey).toBe("test-anon-key");
      expect(env.nodeEnv).toBe("test");
    });

    it("reports whether the public Supabase configuration is present", async () => {
      stubEnvGroup(validPublicEnv);

      const { hasPublicSupabaseEnv } = await loadPublicEnvModule();

      expect(hasPublicSupabaseEnv()).toBe(true);

      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      expect(hasPublicSupabaseEnv()).toBe(false);
    });

    it("throws when required public Supabase variables are missing", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      await withDeletedEnv("NEXT_PUBLIC_SUPABASE_URL", async () => {
        const { getPublicEnv } = await loadPublicEnvModule();

        expect(() => getPublicEnv()).toThrow(
          /Missing required public environment variable: NEXT_PUBLIC_SUPABASE_URL/
        );
      });
    });
  });

  describe("getPublicAuthEnv", () => {
    it("returns auth URLs when the required variables are valid", async () => {
      stubEnvGroup(validPublicAuthEnv);

      const { getPublicAuthEnv } = await loadPublicEnvModule();
      const env = getPublicAuthEnv();

      expect(env.siteUrl).toBe(validPublicAuthEnv.NEXT_PUBLIC_SITE_URL);
      expect(env.authCallbackUrl).toBe(validPublicAuthEnv.NEXT_PUBLIC_AUTH_CALLBACK_URL);
    });

    it.each([
      ["NEXT_PUBLIC_SITE_URL", "not-a-url"],
      ["NEXT_PUBLIC_AUTH_CALLBACK_URL", "/auth/callback"]
    ])("throws when %s is not an absolute http or https URL", async (key, value) => {
      stubEnvGroup(validPublicAuthEnv);
      vi.stubEnv(key, value);

      const { getPublicAuthEnv } = await loadPublicEnvModule();

      expect(() => getPublicAuthEnv()).toThrow(
        new RegExp(`Invalid public environment variable: ${key}`)
      );
    });

    it("throws when the auth callback URL is missing", async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", validPublicAuthEnv.NEXT_PUBLIC_SITE_URL);

      await withDeletedEnv("NEXT_PUBLIC_AUTH_CALLBACK_URL", async () => {
        const { getPublicAuthEnv } = await loadPublicEnvModule();

        expect(() => getPublicAuthEnv()).toThrow(
          /Missing required public environment variable: NEXT_PUBLIC_AUTH_CALLBACK_URL/
        );
      });
    });
  });

  describe("getAuthEnv", () => {
    it("returns the merged public and auth environment for auth infrastructure", async () => {
      stubEnvGroup(validPublicEnv);
      stubEnvGroup(validPublicAuthEnv);

      const { getAuthEnv } = await loadServerEnvModule();
      const env = getAuthEnv();

      expect(env).toMatchObject({
        supabaseUrl: validPublicEnv.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: validPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        siteUrl: validPublicAuthEnv.NEXT_PUBLIC_SITE_URL,
        authCallbackUrl: validPublicAuthEnv.NEXT_PUBLIC_AUTH_CALLBACK_URL
      });
    });
  });

  describe("getInfrastructureServerEnv", () => {
    it("returns infrastructure environment when all required variables are valid", async () => {
      stubEnvGroup(validPublicEnv);
      stubEnvGroup(validInfrastructureEnv);

      const { getInfrastructureServerEnv } = await loadServerEnvModule();
      const env = getInfrastructureServerEnv();

      expect(env.supabaseUrl).toBe(validPublicEnv.NEXT_PUBLIC_SUPABASE_URL);
      expect(env.supabaseServiceRoleKey).toBe(validInfrastructureEnv.SUPABASE_SERVICE_ROLE_KEY);
      expect(env.aiProviderApiKey).toBe(validInfrastructureEnv.AI_PROVIDER_API_KEY);
      expect(env.mayarApiKey).toBe(validInfrastructureEnv.MAYAR_API_KEY);
      expect(env.mayarWebhookSecret).toBe(validInfrastructureEnv.MAYAR_WEBHOOK_SECRET);
    });

    it.each([
      ["SUPABASE_SERVICE_ROLE_KEY", "required for admin database access"],
      ["AI_PROVIDER_API_KEY", "required for AI service"],
      ["MAYAR_API_KEY", "required for payment service"],
      ["MAYAR_WEBHOOK_SECRET", "required for payment webhooks"]
    ])("throws when %s is missing", async (key, description) => {
      stubEnvGroup(validPublicEnv);
      stubEnvGroup(validInfrastructureEnv);

      await withDeletedEnv(key, async () => {
        const { getInfrastructureServerEnv } = await loadServerEnvModule();

        expect(() => getInfrastructureServerEnv()).toThrow(
          new RegExp(String.raw`Missing required environment variable: ${key} \(${description}\)`)
        );
      });
    });
  });

  describe("getServerEnv", () => {
    it("throws when required public variables are invalid", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      const { getServerEnv } = await loadServerEnvModule();

      expect(() => getServerEnv()).toThrow(
        /Missing required public environment variable: NEXT_PUBLIC_SUPABASE_URL/
      );
    });
  });
});
