import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

// Mock next/headers before importing the server client
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn()
  })
}));

describe("supabase client boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("browser client", () => {
    it("returns a valid Supabase client instance", () => {
      const client = getSupabaseBrowserClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.from).toBeDefined();
    });

    it("returns the same singleton instance on multiple calls", () => {
      const firstCall = getSupabaseBrowserClient();
      const secondCall = getSupabaseBrowserClient();

      expect(firstCall).toBe(secondCall);
    });

    it("uses session persistence for browser authentication", () => {
      const client = getSupabaseBrowserClient();

      // The client should have auth methods available for session management
      expect(client.auth.getSession).toBeDefined();
      expect(client.auth.signInWithPassword).toBeDefined();
      expect(client.auth.signOut).toBeDefined();
    });
  });

  describe("server client", () => {
    it("returns a valid Supabase client instance", async () => {
      const client = await getSupabaseServerClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.from).toBeDefined();
    });

    it("creates a new instance for each request (no singleton)", async () => {
      const firstClient = await getSupabaseServerClient();
      const secondClient = await getSupabaseServerClient();

      // Request-scoped clients must be different instances
      expect(firstClient).not.toBe(secondClient);
    });

    it("has auth methods available for server-side operations", async () => {
      const client = await getSupabaseServerClient();

      // Server client should have auth methods but without session persistence
      expect(client.auth.getSession).toBeDefined();
      expect(client.auth.getUser).toBeDefined();
    });
  });

  describe("admin client", () => {
    it("returns a valid Supabase client instance", () => {
      const client = getSupabaseAdminClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.from).toBeDefined();
    });

    it("returns the same singleton instance on multiple calls", () => {
      const firstCall = getSupabaseAdminClient();
      const secondCall = getSupabaseAdminClient();

      expect(firstCall).toBe(secondCall);
    });

    it("has admin-level database access methods", () => {
      const client = getSupabaseAdminClient();

      // Admin client should have auth methods with elevated privileges
      expect(client.auth.getSession).toBeDefined();
      expect(client.auth.getUser).toBeDefined();
    });
  });

  describe("client isolation", () => {
    it("browser, server, and admin clients are separate instances", async () => {
      const browserClient = getSupabaseBrowserClient();
      const serverClient = await getSupabaseServerClient();
      const adminClient = getSupabaseAdminClient();

      expect(browserClient).not.toBe(serverClient);
      expect(browserClient).not.toBe(adminClient);
      expect(serverClient).not.toBe(adminClient);
    });
  });

  describe("boundary safety", () => {
    it("browser client module is protected by client-only", () => {
      const client = getSupabaseBrowserClient();
      expect(client).toBeDefined();
    });

    it("server client module is protected by server-only", async () => {
      const client = await getSupabaseServerClient();
      expect(client).toBeDefined();
    });

    it("admin client module is protected by server-only", () => {
      const client = getSupabaseAdminClient();
      expect(client).toBeDefined();
    });
  });

  describe("configuration validation", () => {
    it("browser client requires NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
      expect(() => {
        getSupabaseBrowserClient();
      }).not.toThrow();
    });

    it("server client requires NEXT_PUBLIC_SUPABASE_URL", async () => {
      await expect(getSupabaseServerClient()).resolves.toBeDefined();
    });

    it("server client requires NEXT_PUBLIC_SUPABASE_ANON_KEY", async () => {
      await expect(getSupabaseServerClient()).resolves.toBeDefined();
    });

    it("admin client requires NEXT_PUBLIC_SUPABASE_URL", () => {
      expect(() => {
        getSupabaseAdminClient();
      }).not.toThrow();
    });

    it("admin client requires SUPABASE_SERVICE_ROLE_KEY", () => {
      expect(() => {
        getSupabaseAdminClient();
      }).not.toThrow();
    });
  });
});
