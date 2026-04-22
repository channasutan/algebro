import "client-only";

/**
 * Browser-safe Supabase client.
 *
 * This client uses the anonymous key and is safe to import in browser code.
 * Session persistence is enabled for browser authentication flows.
 *
 * @example
 * import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

  return browserClient;
}
