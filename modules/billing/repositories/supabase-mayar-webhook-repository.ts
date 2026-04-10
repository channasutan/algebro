import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MayarWebhookData = {
  id: string;
  status: string;
  amount: number;
  customer?: { name?: string; email?: string };
  payment?: { method?: string; referenceId?: string };
};

export type MayarWebhookRepository = {
  isDuplicateEvent: (eventId: string) => Promise<boolean>;
  storeWebhookEvent: (eventId: string, eventType: string, payload: unknown) => Promise<void>;
  markPaymentSuccess: (data: MayarWebhookData) => Promise<void>;
  markPaymentFailed: (data: Pick<MayarWebhookData, "id" | "status">) => Promise<void>;
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

export async function createSupabaseMayarWebhookRepository(): Promise<MayarWebhookRepository> {
  const supabase = await getSupabaseServerClient();

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
  ): Promise<void> => {
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
      throw error;
    }
  };

  const markPaymentSuccess = async (data: MayarWebhookData): Promise<void> => {
    await updatePaymentAndSubscription(
      supabase,
      { status: data.status, amount: data.amount, provider_payment_id: data.id },
      "active"
    );
  };

  const markPaymentFailed = async (
    data: Pick<MayarWebhookData, "id" | "status">
  ): Promise<void> => {
    await updatePaymentAndSubscription(
      supabase,
      { status: data.status, provider_payment_id: data.id },
      "failed"
    );
  };

  const markSubscriptionCancelled = async (
    data: Pick<MayarWebhookData, "id">
  ): Promise<void> => {
    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("subscription_id")
      .eq("provider", "mayar")
      .eq("provider_payment_id", data.id)
      .maybeSingle();

    if (paymentLookupError) {
      throw paymentLookupError;
    }

    const subscriptionId = payment?.subscription_id ?? data.id;

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
      })
      .eq("id", subscriptionId);

    if (error) {
      throw error;
    }
  };

  return {
    isDuplicateEvent,
    storeWebhookEvent,
    markPaymentSuccess,
    markPaymentFailed,
    markSubscriptionCancelled,
  };
}
