import "client-only";

/**
 * Browser-only realtime helper using a Supabase browser client instance.
 * Provides channel creation, subscription, and cleanup for realtime features.
 */
import type { RealtimeChannel, RealtimeChannelOptions, SupabaseClient } from "@supabase/supabase-js";

export type RealtimeChannelName = "lobby" | `duel:${string}`;

const terminalStatuses = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

function isConfigured(configured: boolean): boolean {
  return configured;
}

async function createChannel(
  client: SupabaseClient,
  channelName: RealtimeChannelName,
  options?: RealtimeChannelOptions
): Promise<RealtimeChannel> {
  return client.channel(channelName, options);
}

async function subscribe(channel: RealtimeChannel): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        resolve();
        return;
      }

      if (terminalStatuses.has(status)) {
        reject(new Error(`Supabase realtime subscription failed with status ${status}`));
      }
    });
  });
}

async function closeChannel(
  client: SupabaseClient,
  channel: RealtimeChannel
): Promise<"ok" | "timed out" | "error"> {
  return client.removeChannel(channel);
}

export const supabaseRealtime = {
  isConfigured,
  createChannel,
  subscribe,
  closeChannel
};
