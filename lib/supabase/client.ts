import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/config/env.public";

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

function readRequiredServerEnv(value: string | undefined, key: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
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

  const { supabaseAnonKey } = getPublicEnv();

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

  const supabaseServiceRoleKey = readRequiredServerEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  adminClient = createSupabaseInstance(supabaseServiceRoleKey, false);

  return adminClient;
}
