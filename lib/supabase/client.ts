import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getInfrastructureServerEnv, getPublicEnv, getServerEnv } from "@/config/env";

type Database = Record<string, never>;

let browserClient: SupabaseClient<Database> | undefined;
let serverClient: SupabaseClient<Database> | undefined;
let adminClient: SupabaseClient<Database> | undefined;

function createSupabaseInstance(key: string, persistSession: boolean): SupabaseClient<Database> {
  const { supabaseUrl } = getPublicEnv();

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: persistSession,
      persistSession
    }
  });
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseAnonKey } = getPublicEnv();

  browserClient = createSupabaseInstance(supabaseAnonKey, true);

  return browserClient;
}

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (serverClient) {
    return serverClient;
  }

  const { supabaseAnonKey } = getServerEnv();

  serverClient = createSupabaseInstance(supabaseAnonKey, false);

  return serverClient;
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client is only available on the server.");
  }

  if (adminClient) {
    return adminClient;
  }

  const { supabaseServiceRoleKey } = getInfrastructureServerEnv();

  adminClient = createSupabaseInstance(supabaseServiceRoleKey, false);

  return adminClient;
}
