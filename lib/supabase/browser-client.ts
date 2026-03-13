/**
 * Browser-safe Supabase client.
 *
 * This client uses the anonymous key and is safe to import in browser code.
 * Session persistence is enabled for browser authentication flows.
 *
 * @example
 * import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/config/env.public";

type Database = Record<string, never>;

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });

  return browserClient;
}
