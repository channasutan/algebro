import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export function createBillingClient() {
  return getSupabaseServerClient();
}
