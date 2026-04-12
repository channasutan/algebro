import { getBillingSupabaseClient } from "../infrastructure/supabase-provider";
import { handleMayarWebhook } from "../index";

export async function handleMayarWebhook(eventId: string, event: string, payload: { event: string; data: any }): Promise<ReturnType<typeof handleMayarWebhook>> {
  const client = getBillingSupabaseClient();
  return handleMayarWebhook(eventId, event, payload);
}