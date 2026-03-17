import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { getPublicEnv } from "@/config/env.server-entry";

type Database = Record<string, never>;

/**
 * Creates a cookie adapter that delegates to the provided cookie store.
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
        console.warn("[supabase-server-client] Cannot set cookies in Server Component context");
      }
    },
  };
}

/**
 * Build a request-scoped Supabase server client around a provided cookie store.
 * This is the lower-level helper that enables testing without Next.js request context.
 *
 * @param cookieStore - The cookie store to use for session persistence
 * @returns A Supabase client instance configured with the provided cookie store
 */
export function buildSupabaseServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): SupabaseClient<Database> {
  const cookieAdapter = createCookieAdapter(cookieStore);
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: cookieAdapter,
    }
  );
}

/**
 * Creates a request-scoped Supabase client with session support.
 * Uses cookies from the current request to maintain session state.
 *
 * This is the runtime entrypoint that should be used in server components,
 * API routes, and server actions.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  return buildSupabaseServerClient(cookieStore);
}
