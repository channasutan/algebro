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
      const { supabaseRealtime, getSupabaseBrowserClient } = await loadRealtimeModule();

      expect(supabaseRealtime.isConfigured()).toBe(true);
      expect(getSupabaseBrowserClient).toHaveBeenCalledTimes(1);
    });

    it("returns false when browser client initialization fails", async () => {
      const { supabaseRealtime, getSupabaseBrowserClient } = await loadRealtimeModule({
        clientFactory: () => {
          throw new Error("Missing Supabase public configuration");
        }
      });

      expect(supabaseRealtime.isConfigured()).toBe(false);
      expect(getSupabaseBrowserClient).toHaveBeenCalledTimes(1);
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
      const result = supabaseRealtime.createChannel("duel:test-room", options);

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
