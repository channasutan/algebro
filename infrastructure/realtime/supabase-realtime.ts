import "client-only";

/**
 * Browser-only realtime helper using the Supabase browser client.
 * Provides channel creation, subscription, and cleanup for realtime features.
 */
import type { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export type RealtimeChannelName = "lobby" | `duel:${string}`;

const terminalStatuses = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

function isConfigured(): boolean {
  try {
    return Boolean(getSupabaseBrowserClient());
  } catch {
    return false;
  }
}

function createChannel(
  channelName: RealtimeChannelName,
  options?: RealtimeChannelOptions
): RealtimeChannel {
  return getSupabaseBrowserClient().channel(channelName, options);
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

async function closeChannel(channel: RealtimeChannel): Promise<"ok" | "timed out" | "error"> {
  return getSupabaseBrowserClient().removeChannel(channel);
}

export const supabaseRealtime = {
  isConfigured,
  createChannel,
  subscribe,
  closeChannel
};
