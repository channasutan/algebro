import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { getPublicEnv } from "@/config/env.server-entry";

type Database = Record<string, never>;

/**
 * Creates a cookie adapter that delegates to the Next.js cookies() store.
 * This adapter implements the interface expected by @supabase/ssr without type casting.
 */
function createCookieAdapter(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Called from Server Component
      }
    },
  };
}

/**
 * Creates a request-scoped Supabase client with session support.
 * Uses cookies from the current request to maintain session state.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const cookieAdapter = createCookieAdapter(cookieStore);

  const supabase = createServerClient<Database>(
    getPublicEnv().supabaseUrl,
    getPublicEnv().supabaseAnonKey,
    {
      cookies: cookieAdapter,
    }
  );

  return supabase;
}
