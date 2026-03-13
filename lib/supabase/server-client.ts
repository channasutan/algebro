import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/config/env.server-entry";

type Database = Record<string, never>;

let serverClient: SupabaseClient<Database> | undefined;

/**
 * Server-side Supabase client using the anon key.
 *
 * Intended for use in:
 * - Server components
 * - API routes
 * - Server actions
 *
 * Uses the public anon key with no session persistence.
 * For admin operations requiring elevated privileges, use `getSupabaseAdminClient` from `@/lib/supabase/admin-client`.
 *
 * @returns A singleton Supabase client instance for server-side use
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (serverClient) {
    return serverClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  serverClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return serverClient;
}
