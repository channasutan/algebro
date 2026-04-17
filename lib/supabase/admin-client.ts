import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  getPublicEnv,
  getSupabaseServiceRoleKey,
} from "@/config/env.server-entry";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: SupabaseClient<Database> | undefined;

/**
 * Admin Supabase client using the service-role key.
 *
 * **SERVER-ONLY**: This module is protected by the `server-only` package.
 * Attempting to import this in browser code will cause a build error.
 *
 * Intended for use in:
 * - Server-side admin operations
 * - Background jobs
 * - System-level database operations
 *
 * This client bypasses Row Level Security (RLS) and has full database access.
 * Use with caution and only when elevated privileges are required.
 *
 * @returns A singleton Supabase admin client instance with service-role privileges
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl } = getPublicEnv();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}
