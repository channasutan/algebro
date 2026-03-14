import "client-only";

/**
 * Browser-only realtime helper using the Supabase browser client.
 * Provides channel creation, subscription, and cleanup for realtime features.
 */
import type { RealtimeChannel, RealtimeChannelOptions, SupabaseClient } from "@supabase/supabase-js";

export type RealtimeChannelName = "lobby" | `duel:${string}`;

const terminalStatuses = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

// Lazy-loaded browser client to avoid initialization at module load time
// This allows isConfigured() to work without triggering client creation
let cachedClient: SupabaseClient | null = null;

async function getClient(): Promise<SupabaseClient> {
  if (cachedClient) {
    return cachedClient;
  }
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/browser-client");
  cachedClient = getSupabaseBrowserClient();
  return cachedClient;
}

function isConfigured(): boolean {
  // Pure configuration check - verify Supabase public config exists without instantiating client
  // Uses config accessor, but validates env vars directly since the config layer throws on missing values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

async function createChannel(
  channelName: RealtimeChannelName,
  options?: RealtimeChannelOptions
): Promise<RealtimeChannel> {
  const client = await getClient();
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

async function closeChannel(channel: RealtimeChannel): Promise<"ok" | "timed out" | "error"> {
  const client = await getClient();
  return client.removeChannel(channel);
}

export const supabaseRealtime = {
  isConfigured,
  createChannel,
  subscribe,
  closeChannel
};
