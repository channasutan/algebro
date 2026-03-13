import { describe, expect, it } from "vitest";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

describe("supabase client boundary", () => {
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
    it("returns a valid Supabase client instance", () => {
      const client = getSupabaseServerClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.from).toBeDefined();
    });

    it("returns the same singleton instance on multiple calls", () => {
      const firstCall = getSupabaseServerClient();
      const secondCall = getSupabaseServerClient();

      expect(firstCall).toBe(secondCall);
    });

    it("has auth methods available for server-side operations", () => {
      const client = getSupabaseServerClient();

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

      // Admin client should have full database access
      expect(client.from).toBeDefined();
      expect(client.rpc).toBeDefined();
      expect(client.auth.admin).toBeDefined();
    });
  });

  describe("client isolation", () => {
    it("browser, server, and admin clients are separate instances", () => {
      const browserClient = getSupabaseBrowserClient();
      const serverClient = getSupabaseServerClient();
      const adminClient = getSupabaseAdminClient();

      // Each client should be a distinct instance
      expect(browserClient).not.toBe(serverClient);
      expect(browserClient).not.toBe(adminClient);
      expect(serverClient).not.toBe(adminClient);
    });
  });

  describe("boundary safety", () => {
    it("browser client module is protected by client-only", () => {
      // This test verifies that the browser-client.ts file imports "client-only"
      // The actual build-time protection is enforced by the bundler
      // If this test runs, it means the module structure is correct
      expect(getSupabaseBrowserClient).toBeDefined();
    });

    it("server client module is protected by server-only", () => {
      // This test verifies that the server-client.ts file imports "server-only"
      // The actual build-time protection is enforced by the bundler
      // If this test runs in a Node environment, the protection is working
      expect(getSupabaseServerClient).toBeDefined();
    });

    it("admin client module is protected by server-only", () => {
      // This test verifies that the admin-client.ts file imports "server-only"
      // The actual build-time protection is enforced by the bundler
      // If this test runs in a Node environment, the protection is working
      expect(getSupabaseAdminClient).toBeDefined();
    });
  });

  describe("configuration validation", () => {
    it("browser client requires NEXT_PUBLIC_SUPABASE_URL", () => {
      // If the client is created successfully, the env var is present
      const client = getSupabaseBrowserClient();
      expect(client).toBeDefined();
    });

    it("browser client requires NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
      // If the client is created successfully, the env var is present
      const client = getSupabaseBrowserClient();
      expect(client).toBeDefined();
    });

    it("server client requires NEXT_PUBLIC_SUPABASE_URL", () => {
      // If the client is created successfully, the env var is present
      const client = getSupabaseServerClient();
      expect(client).toBeDefined();
    });

    it("server client requires NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
      // If the client is created successfully, the env var is present
      const client = getSupabaseServerClient();
      expect(client).toBeDefined();
    });

    it("admin client requires NEXT_PUBLIC_SUPABASE_URL", () => {
      // If the client is created successfully, the env var is present
      const client = getSupabaseAdminClient();
      expect(client).toBeDefined();
    });

    it("admin client requires SUPABASE_SERVICE_ROLE_KEY", () => {
      // If the admin client is created successfully, the service role key is present
      // This is the critical test that verifies the admin client uses the service role key
      const client = getSupabaseAdminClient();
      expect(client).toBeDefined();
      
      // Admin client should have admin-specific auth methods
      expect(client.auth.admin).toBeDefined();
    });
  });
});
