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

  browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

  return browserClient;
}
