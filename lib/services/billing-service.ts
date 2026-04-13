import {
  createSupabaseMayarWebhookRepository,
  type MayarWebhookData,
} from "@/repositories/billing/supabase-mayar-webhook-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export type { MayarWebhookData };

export async function handleMayarWebhook(
  eventId: string,
  event: string,
  payload: { event: string; data: MayarWebhookData }
): Promise<{ ok: boolean } | { duplicate: boolean }> {
  const supabase = getSupabaseServerClient();
  const repo = await createSupabaseMayarWebhookRepository(supabase);
  const isDuplicate = await repo.isDuplicateEvent(eventId);

  if (isDuplicate) {
    return { duplicate: true };
  }

  const data = payload.data;

  switch (event) {
    case "payment.success":
      await repo.markPaymentSuccess(data);
      break;
    case "payment.failed":
      await repo.markPaymentFailed(data);
      break;
    case "subscription.cancelled":
      await repo.markSubscriptionCancelled(data);
      break;
    default:
      break;
  }

  await repo.storeWebhookEvent(eventId, event, payload);

  return { ok: true };
}
