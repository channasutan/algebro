import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
-- Migration required (run once in Supabase SQL editor):
-- CREATE UNIQUE INDEX IF NOT EXISTS jobs_mayar_event_id_unique
--   ON jobs (type, (payload->>'event_id'))
--   WHERE type = 'mayar_webhook';
*/

export type MayarWebhookData = {
  id: string;
  status: string;
  amount: number;
  customer?: { name?: string; email?: string };
  payment?: { method?: string; referenceId?: string };
};

export type MayarWebhookRepository = {
  isDuplicateEvent: (eventId: string) => Promise<boolean>;
  storeWebhookEvent: (eventId: string, eventType: string, payload: unknown) => Promise<boolean>;
  markPaymentSuccess: (data: MayarWebhookData) => Promise<void>;
  markPaymentFailed: (data: Pick<MayarWebhookData, "id" | "status">) => Promise<void>;
  markPaymentExpired: (data: Pick<MayarWebhookData, "id" | "status">) => Promise<void>;
  markSubscriptionActive: (data: Pick<MayarWebhookData, "id">) => Promise<void>;
  markSubscriptionCancelled: (data: Pick<MayarWebhookData, "id">) => Promise<void>;
};

function toJson(value: unknown): Json {
  return value as Json;
}

type PaymentUpdateFields = {
  status: string;
  provider_payment_id: string;
  amount?: number;
};

type SubscriptionOutcome = "active" | "failed" | "cancelled";

function assertNoError(error: unknown): void {
  if (error) throw error;
}

async function updatePaymentAndSubscription(
  supabase: SupabaseClient,
  paymentFields: PaymentUpdateFields,
  subscriptionStatus: SubscriptionOutcome
): Promise<void> {
  const providerId = paymentFields.provider_payment_id;

  const { data: payment, error: lookupError } = await supabase
    .from("payments")
    .select("subscription_id")
    .eq("provider", "mayar")
    .eq("provider_payment_id", providerId)
    .maybeSingle();

  assertNoError(lookupError);

  const { error: paymentError } = await supabase
    .from("payments")
    .update(paymentFields)
    .eq("provider", "mayar")
    .eq("provider_payment_id", providerId);

  assertNoError(paymentError);

  if (payment?.subscription_id) {
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ status: subscriptionStatus })
      .eq("id", payment.subscription_id);

    assertNoError(subError);
  }
}

async function updateSubscriptionStatus(
  supabase: SupabaseClient,
  providerId: string,
  status: "active" | "cancelled"
): Promise<void> {
  const { data: payment, error: paymentLookupError } = await supabase
    .from("payments")
    .select("subscription_id")
    .eq("provider", "mayar")
    .eq("provider_payment_id", providerId)
    .maybeSingle();

  if (paymentLookupError) throw paymentLookupError;

  const subscriptionId = payment?.subscription_id ?? providerId;

  const { error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("id", subscriptionId);

  if (error) throw error;
}

export async function createSupabaseMayarWebhookRepository(supabase: SupabaseClient): Promise<MayarWebhookRepository> {

  const isDuplicateEvent = async (eventId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("jobs")
      .select("id")
      .eq("type", "mayar_webhook")
      .contains("payload", { event_id: eventId })
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data !== null;
  };

  const storeWebhookEvent = async (
    eventId: string,
    eventType: string,
    payload: unknown
  ): Promise<boolean> => {
    const { error } = await supabase.from("jobs").insert({
      type: "mayar_webhook",
      status: "processed",
      payload: toJson({
        event_id: eventId,
        event_type: eventType,
        payload: toJson(payload),
      }),
      processed_at: new Date().toISOString(),
    });

    if (error) {
      // Postgres unique_violation = duplicate event — safe to ignore
      if (error.code === "23505") return false;
      throw error;
    }

    return true;
  };

  const markPaymentSuccess = async (data: MayarWebhookData): Promise<void> => {
    await updatePaymentAndSubscription(
      supabase,
      { status: data.status, amount: data.amount, provider_payment_id: data.id },
      "active"
    );
  };

  async function markPaymentOutcome(
    supabase: SupabaseClient,
    data: Pick<MayarWebhookData, "id" | "status">
  ): Promise<void> {
    await updatePaymentAndSubscription(
      supabase,
      { status: data.status, provider_payment_id: data.id },
      "failed"
    );
  }

  const markPaymentFailed = (data: Pick<MayarWebhookData, "id" | "status">) =>
    markPaymentOutcome(supabase, data);

  const markPaymentExpired = (data: Pick<MayarWebhookData, "id" | "status">) =>
    markPaymentOutcome(supabase, data);

  return {
    isDuplicateEvent,
    storeWebhookEvent,
    markPaymentSuccess,
    markPaymentFailed,
    markPaymentExpired,
    markSubscriptionActive: (data: Pick<MayarWebhookData, "id">) =>
      updateSubscriptionStatus(supabase, data.id, "active"),
    markSubscriptionCancelled: (data: Pick<MayarWebhookData, "id">) =>
      updateSubscriptionStatus(supabase, data.id, "cancelled"),
  };
}
