import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { handleMayarWebhook as _handleMayarWebhook } from "@/modules/billing";
import type { MayarWebhookData } from "@/modules/billing";
export type { MayarWebhookData };

export async function handleMayarWebhook(
  eventId: string,
  event: string,
  payload: { event: string; data: MayarWebhookData }
) {
  const supabase = await getSupabaseServerClient();
  return _handleMayarWebhook(supabase, eventId, event, payload);
}
