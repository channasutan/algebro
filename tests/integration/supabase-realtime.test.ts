import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

async function loadRealtimeModule() {
  vi.resetModules();

  const { supabaseRealtime } = await import("@/infrastructure/realtime/supabase-realtime");

  return { supabaseRealtime };
}

describe("supabase realtime", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("isConfigured", () => {
    it("returns true when Supabase public configuration is available", async () => {
      const { supabaseRealtime } = await loadRealtimeModule();

      expect(supabaseRealtime.isConfigured()).toBe(true);
    });

    it("returns false when Supabase public configuration is missing", async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const { supabaseRealtime } = await loadRealtimeModule();

        expect(supabaseRealtime.isConfigured()).toBe(false);
      } finally {
        if (originalUrl === undefined) {
          delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        } else {
          process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        }

        if (originalKey === undefined) {
          delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        } else {
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
        }
      }
    });
  });

  describe("createChannel", () => {
    it("delegates channel creation to the provided Supabase client", async () => {
      const mockChannel = { subscribe: vi.fn() };
      const client = {
        channel: vi.fn().mockReturnValue(mockChannel)
      } as Pick<SupabaseClient, "channel"> as SupabaseClient;

      const { supabaseRealtime } = await loadRealtimeModule();

      const options = { config: { private: true } };
      const result = await supabaseRealtime.createChannel(client, "duel:test-room", options);

      expect(client.channel).toHaveBeenCalledWith("duel:test-room", options);
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
    it("delegates channel cleanup to the provided Supabase client", async () => {
      const mockChannel = { topic: "duel:test-room" } as RealtimeChannel;
      const client = {
        removeChannel: vi.fn().mockResolvedValue("ok")
      } as Pick<SupabaseClient, "removeChannel"> as SupabaseClient;

      const { supabaseRealtime } = await loadRealtimeModule();

      await expect(supabaseRealtime.closeChannel(client, mockChannel)).resolves.toBe("ok");
      expect(client.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
