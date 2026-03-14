import { afterEach, describe, expect, it, vi } from "vitest";

type MockBrowserClient = {
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
};

async function loadRealtimeModule(options?: {
  client?: Partial<MockBrowserClient>;
  clientFactory?: () => unknown;
}) {
  vi.resetModules();

  const mockClient: MockBrowserClient = {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    ...options?.client
  };

  const getSupabaseBrowserClient = vi.fn(options?.clientFactory ?? (() => mockClient));

  vi.doMock("@/lib/supabase/browser-client", () => ({
    getSupabaseBrowserClient
  }));

  const { supabaseRealtime } = await import("@/infrastructure/realtime/supabase-realtime");

  return {
    supabaseRealtime,
    getSupabaseBrowserClient,
    mockClient
  };
}

describe("supabase realtime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/browser-client");
  });

  describe("isConfigured", () => {
    it("returns true when the browser client is available", async () => {
      // Test with default test environment which has NEXT_PUBLIC_SUPABASE_URL and
      // NEXT_PUBLIC_SUPABASE_ANON_KEY set in vitest setup
      const { supabaseRealtime } = await loadRealtimeModule();

      expect(supabaseRealtime.isConfigured()).toBe(true);
    });

    it("returns false when Supabase public configuration is missing", async () => {
      // Set up mock BEFORE deleting env vars and re-importing
      // This ensures the mock is in place when browser-client is imported
      const mockClient: MockBrowserClient = {
        channel: vi.fn(),
        removeChannel: vi.fn()
      };

      vi.doMock("@/lib/supabase/browser-client", () => ({
        getSupabaseBrowserClient: vi.fn(() => mockClient)
      }));

      // Save original values
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        // Remove the env vars to test the missing case
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Reset modules and re-import to get fresh module state
        vi.resetModules();
        const { supabaseRealtime: freshRealtime } = await import("@/infrastructure/realtime/supabase-realtime");
        const result = freshRealtime.isConfigured();

        expect(result).toBe(false);
      } finally {
        // Restore original values
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
      }
    });
  });

  describe("createChannel", () => {
    it("delegates channel creation to the Supabase browser client", async () => {
      const mockChannel = { subscribe: vi.fn() };
      const { supabaseRealtime, getSupabaseBrowserClient, mockClient } = await loadRealtimeModule({
        client: {
          channel: vi.fn().mockReturnValue(mockChannel)
        }
      });

      const options = { config: { private: true } };
      const result = await supabaseRealtime.createChannel("duel:test-room", options);

      expect(getSupabaseBrowserClient).toHaveBeenCalledTimes(1);
      expect(mockClient.channel).toHaveBeenCalledWith("duel:test-room", options);
      expect(result).toBe(mockChannel);
    });
  });

  describe("subscribe", () => {
    it("resolves when the channel reaches SUBSCRIBED", async () => {
      const { supabaseRealtime } = await loadRealtimeModule();
      const mockChannel = {
        subscribe: vi.fn((callback: (status: string) => void) => {
          callback("SUBSCRIBED");
          return mockChannel;
        })
      };

      await expect(supabaseRealtime.subscribe(mockChannel as never)).resolves.toBeUndefined();
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it("ignores non-terminal statuses before succeeding", async () => {
      const { supabaseRealtime } = await loadRealtimeModule();
      const mockChannel = {
        subscribe: vi.fn((callback: (status: string) => void) => {
          callback("JOINING");
          callback("SUBSCRIBED");
          return mockChannel;
        })
      };

      await expect(supabaseRealtime.subscribe(mockChannel as never)).resolves.toBeUndefined();
    });

    it.each(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"])(
      "rejects when the channel reaches terminal status %s",
      async (status) => {
        const { supabaseRealtime } = await loadRealtimeModule();
        const mockChannel = {
          subscribe: vi.fn((callback: (value: string) => void) => {
            callback(status);
            return mockChannel;
          })
        };

        await expect(supabaseRealtime.subscribe(mockChannel as never)).rejects.toThrow(
          `Supabase realtime subscription failed with status ${status}`
        );
      }
    );

    it("propagates subscribe callback registration errors", async () => {
      const { supabaseRealtime } = await loadRealtimeModule();
      const mockChannel = {
        subscribe: vi.fn(() => {
          throw new Error("subscribe registration failed");
        })
      };

      await expect(supabaseRealtime.subscribe(mockChannel as never)).rejects.toThrow(
        "subscribe registration failed"
      );
    });
  });

  describe("closeChannel", () => {
    it("delegates channel cleanup to the Supabase browser client", async () => {
      const mockChannel = { topic: "duel:test-room" };
      const { supabaseRealtime, getSupabaseBrowserClient, mockClient } = await loadRealtimeModule({
        client: {
          removeChannel: vi.fn().mockResolvedValue("ok")
        }
      });

      await expect(supabaseRealtime.closeChannel(mockChannel as never)).resolves.toBe("ok");
      expect(getSupabaseBrowserClient).toHaveBeenCalledTimes(1);
      expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
