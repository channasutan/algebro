
import { createSupabaseMayarWebhookRepository } from "@/repositories/billing/supabase-mayar-webhook-repository";
import { createBillingClient } from "./infrastructure/supabase-billing-client";

export const billingModule = {
  name: "billing"
} as const;

export type PlanTier = "free" | "premium";

export type FeatureAccessResult = {
  allowed: boolean;
  planTier: PlanTier;
};

/**
 * Stub implementation — always returns free-tier allowed.
 * Phase 8 unit tests mock this via vi.mock("@/modules/billing").
 * Replace with real subscription lookup in a future billing phase.
 */
export async function checkFeatureAccess(
  _userId: string,
  _feature: string
): Promise<FeatureAccessResult> {
  return { allowed: true, planTier: "free" };
}

export async function handleMayarWebhook(eventId: string, event: string, payload: { event: string; data: any }) {
  const supabase = createBillingClient();
  const repo = await createSupabaseMayarWebhookRepository(supabase);
  const data = payload.data;

  // Check duplicate
  const isDuplicate = await repo.isDuplicateEvent(eventId);
  if (isDuplicate) {
    return { duplicate: true };
  }

  // Process event
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
  }

  // Store event
  await repo.storeWebhookEvent(eventId, event, payload);

  return { ok: true };
}
