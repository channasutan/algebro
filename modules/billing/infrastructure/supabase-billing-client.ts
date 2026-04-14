import { getSupabaseServerClient } from "@/lib/supabase";

export function createBillingClient() {
  return getSupabaseServerClient();
}
