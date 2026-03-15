import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type SessionCookie = {
  name: string;
  value: string;
};

type MockCookieStore = {
  getAll: ReturnType<typeof vi.fn<() => SessionCookie[]>>;
  set: ReturnType<typeof vi.fn<(name: string, value: string, options: Record<string, unknown>) => void>>;
  snapshot(): SessionCookie[];
};

function createMockCookieStore(initialCookies: SessionCookie[] = []): MockCookieStore {
  let cookies = [...initialCookies];

  return {
    getAll: vi.fn(() => [...cookies]),
    set: vi.fn((name: string, value: string) => {
      cookies = [...cookies.filter((cookie) => cookie.name !== name), { name, value }];
    }),
    snapshot: () => [...cookies]
  };
}

async function loadServerClientModule(requestCookieStores: MockCookieStore[] = []) {
  vi.resetModules();

  const cookiesMock = vi.fn(async () => {
    const cookieStore = requestCookieStores.shift();

    if (!cookieStore) {
      throw new Error("No request cookie store configured for createSupabaseServerClient()");
    }

    return cookieStore;
  });

  const createServerClient = vi.fn((_url: string, _key: string, options: {
    cookies: {
      getAll: () => Promise<SessionCookie[]>;
      setAll: (
        cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>
      ) => Promise<void>;
    };
  }) => ({
    auth: {
      getSession: vi.fn(async () => {
        const cookies = await options.cookies.getAll();
        const accessToken = cookies.find((cookie) => cookie.name === "sb-access-token")?.value ?? null;

        return {
          data: {
            session: accessToken ? { access_token: accessToken } : null
          }
        };
      }),
      getUser: vi.fn(async () => ({
        data: { user: null }
      }))
    },
    from: vi.fn(),
    rpc: vi.fn()
  }));

  vi.doMock("next/headers", () => ({
    cookies: cookiesMock
  }));

  vi.doMock("@supabase/ssr", async () => {
    const actual = await vi.importActual<typeof import("@supabase/ssr")>("@supabase/ssr");

    return {
      ...actual,
      createServerClient
    };
  });

  const serverClientModule = await import("@/lib/supabase/server-client");

  return {
    ...serverClientModule,
    cookiesMock,
    createServerClient
  };
}

describe("supabase client boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@supabase/ssr");
    vi.doUnmock("next/headers");
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
  });

  describe("server client", () => {
    it("creates a request-scoped client that reads the authenticated session from cookies", async () => {
      const requestCookieStore = createMockCookieStore([
        { name: "sb-access-token", value: "token-from-request" }
      ]);
      const { createSupabaseServerClient, createServerClient, cookiesMock } =
        await loadServerClientModule([requestCookieStore]);

      const client = await createSupabaseServerClient();
      const session = await client.auth.getSession();

      expect(cookiesMock).toHaveBeenCalledTimes(1);
      expect(createServerClient).toHaveBeenCalledTimes(1);
      expect(session.data.session?.access_token).toBe("token-from-request");
    });

    it("writes refreshed auth cookies back through the provided request cookie store", async () => {
      const requestCookieStore = createMockCookieStore();
      const { createSupabaseServerClient, createServerClient } = await loadServerClientModule([
        requestCookieStore
      ]);

      await createSupabaseServerClient();

      const serverClientOptions = createServerClient.mock.calls[0]?.[2];

      await serverClientOptions.cookies.setAll([
        {
          name: "sb-refresh-token",
          value: "updated-token",
          options: { path: "/" }
        }
      ]);

      expect(requestCookieStore.set).toHaveBeenCalledWith("sb-refresh-token", "updated-token", {
        path: "/"
      });
      expect(requestCookieStore.snapshot()).toContainEqual({
        name: "sb-refresh-token",
        value: "updated-token"
      });
    });

    it("creates a fresh client for each request", async () => {
      const firstRequestCookieStore = createMockCookieStore([
        { name: "sb-access-token", value: "token-a" }
      ]);
      const secondRequestCookieStore = createMockCookieStore([
        { name: "sb-access-token", value: "token-b" }
      ]);
      const { createSupabaseServerClient, cookiesMock } = await loadServerClientModule([
        firstRequestCookieStore,
        secondRequestCookieStore
      ]);

      const firstClient = await createSupabaseServerClient();
      const secondClient = await createSupabaseServerClient();
      const firstSession = await firstClient.auth.getSession();
      const secondSession = await secondClient.auth.getSession();

      expect(cookiesMock).toHaveBeenCalledTimes(2);
      expect(firstClient).not.toBe(secondClient);
      expect(firstSession.data.session?.access_token).toBe("token-a");
      expect(secondSession.data.session?.access_token).toBe("token-b");
    });

    it("keeps cookie state isolated across parallel requests", async () => {
      const firstRequestCookieStore = createMockCookieStore([
        { name: "sb-access-token", value: "token-a" }
      ]);
      const secondRequestCookieStore = createMockCookieStore([
        { name: "sb-access-token", value: "token-b" }
      ]);
      const { createSupabaseServerClient, createServerClient, cookiesMock } =
        await loadServerClientModule([firstRequestCookieStore, secondRequestCookieStore]);

      const [firstClient, secondClient] = await Promise.all([
        createSupabaseServerClient(),
        createSupabaseServerClient()
      ]);

      expect(cookiesMock).toHaveBeenCalledTimes(2);
      expect(createServerClient).toHaveBeenCalledTimes(2);
      expect(firstClient).not.toBe(secondClient);

      const firstServerClientOptions = createServerClient.mock.calls[0]?.[2];

      await firstServerClientOptions.cookies.setAll([
        {
          name: "sb-access-token",
          value: "token-a-refreshed",
          options: { path: "/" }
        }
      ]);

      const firstSession = await firstClient.auth.getSession();
      const secondSession = await secondClient.auth.getSession();

      expect(firstSession.data.session?.access_token).toBe("token-a-refreshed");
      expect(secondSession.data.session?.access_token).toBe("token-b");
      expect(firstRequestCookieStore.snapshot()).toContainEqual({
        name: "sb-access-token",
        value: "token-a-refreshed"
      });
      expect(secondRequestCookieStore.snapshot()).toContainEqual({
        name: "sb-access-token",
        value: "token-b"
      });
      expect(secondRequestCookieStore.set).not.toHaveBeenCalled();
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
  });
});
