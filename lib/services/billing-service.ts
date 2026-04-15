import { createSupabaseMayarWebhookRepository } from "@/repositories/billing/supabase-mayar-webhook-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export type { MayarWebhookData } from "@/repositories/billing/supabase-mayar-webhook-repository";

export async function handleMayarWebhook(
  eventId: string,
  event: string,
  payload: { event: string; data: import("@/repositories/billing/supabase-mayar-webhook-repository").MayarWebhookData }
): Promise<{ ok: boolean } | { duplicate: boolean }> {
  const supabase = await getSupabaseServerClient();
  const repo = await createSupabaseMayarWebhookRepository(supabase);

  const stored = await repo.storeWebhookEvent(eventId, event, payload);
  if (!stored) {
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
    case "payment.expired":
      await repo.markPaymentExpired(data);
      break;
    case "subscription.active":
      await repo.markSubscriptionActive(data);
      break;
    case "subscription.cancel":
      await repo.markSubscriptionCancelled(data);
      break;
    default:
      break;
  }

  return { ok: true };
}
