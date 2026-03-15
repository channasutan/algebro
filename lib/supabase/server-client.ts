import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/config/env.server-entry";

type Database = Record<string, never>;

type RequestCookie = {
  name: string;
  value: string;
};

type RequestCookieStore = {
  getAll(): RequestCookie[] | Promise<RequestCookie[]>;
  set?(name: string, value: string, options: CookieOptions): void | Promise<void>;
};

/**
 * Build a request-scoped Supabase server client around a request cookie store.
 *
 * Keep this internal so all callers go through createSupabaseServerClient()
 * and get a fresh per-request client from Next.js cookies().
 */
function buildSupabaseServerClient(
  cookieStore: RequestCookieStore
): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () => await cookieStore.getAll(),
      setAll: async (cookiesToSet) => {
        if (!cookieStore.set) {
          return;
        }

        for (const { name, value, options } of cookiesToSet) {
          await cookieStore.set(name, value, options);
        }
      }
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Creates a request-scoped Supabase server client.
 *
 * This function must be called inside a request context.
 * Never cache or store the returned client in module scope.
 * Each request must create its own client to ensure correct cookie isolation.
 * Session persistence is handled through Next.js cookies().
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return buildSupabaseServerClient(cookieStore as RequestCookieStore);
}
