import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getPublicEnv } from "@/config/env.server-entry.ts";
import type { Database } from "@/lib/supabase/database.types";

export async function createBillingClient() {
  return getSupabaseServerClient();
}


