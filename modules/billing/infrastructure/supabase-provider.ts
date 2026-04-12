import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getBillingSupabaseClient(): SupabaseClient {
  return getSupabaseServerClient();
}