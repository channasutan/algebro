import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getMayarWebhookSecret } from "@/config/env.server-entry";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verifies Mayar webhook signature using HMAC-SHA256.
 * Uses timingSafeEqual to prevent timing attacks.
 */
function verifyMayarSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Checks if a webhook event has already been processed (idempotency).
 */
async function isDuplicateEvent(supabase: SupabaseClient, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single();

  return data !== null;
}

/**
 * Stores webhook event for idempotency tracking.
 */
async function storeWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  await supabase.from("webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    payload: payload,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Handles payment.success event.
 * Activates subscription or marks order as paid.
 */
async function handlePaymentSuccess(
  supabase: SupabaseClient,
  data: {
    id: string;
    status: string;
    amount: number;
    customer?: { name?: string; email?: string };
    payment?: { method?: string; referenceId?: string };
  }
): Promise<void> {
  // Update subscription status if this is a subscription payment
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      mayar_invoice_id: data.id,
      paid_at: new Date().toISOString(),
      amount_paid: data.amount,
      payment_method: data.payment?.method,
      payment_reference: data.payment?.referenceId,
    })
    .eq("mayar_invoice_id", data.id);

  if (error) {
    console.error("[mayar webhook] Failed to activate subscription:", error);
    throw error;
  }
}

/**
 * Handles payment.failed event.
 * Marks subscription as failed.
 */
async function handlePaymentFailed(
  supabase: SupabaseClient,
  data: { id: string; status: string }
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "failed",
      mayar_invoice_id: data.id,
    })
    .eq("mayar_invoice_id", data.id);

  if (error) {
    console.error("[mayar webhook] Failed to mark payment as failed:", error);
    throw error;
  }
}

/**
 * Handles subscription.cancelled event.
 * Deactivates subscription.
 */
async function handleSubscriptionCancelled(
  supabase: SupabaseClient,
  data: { id: string }
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("mayar_invoice_id", data.id);

  if (error) {
    console.error("[mayar webhook] Failed to cancel subscription:", error);
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = getMayarWebhookSecret();

  // 1. Read raw body before parsing (needed for HMAC verification)
  const rawBody = await request.text();

  // 2. Read signature from header
  const signature = request.headers.get("x-mayar-signature");

  if (!signature) {
    console.error("[mayar webhook] Missing x-mayar-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  // 3. Verify HMAC signature
  if (!verifyMayarSignature(rawBody, signature, secret)) {
    console.error("[mayar webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 4. Parse verified payload
  let payload: {
    event: string;
    data: {
      id: string;
      status: string;
      amount: number;
      customer?: { name?: string; email?: string };
      payment?: { method?: string; referenceId?: string };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[mayar webhook] Invalid JSON payload");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = payload;
  const eventId = `${event}:${data.id}`;

  // 5. Check for duplicate event (idempotency)
  const supabase = await getSupabaseServerClient();
  const isDuplicate = await isDuplicateEvent(supabase, eventId);

  if (isDuplicate) {
    console.log("[mayar webhook] Duplicate event, acknowledging without reprocessing:", eventId);
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  // 6. Process event based on type
  try {
    switch (event) {
      case "payment.success":
        await handlePaymentSuccess(supabase, data);
        break;

      case "payment.failed":
        await handlePaymentFailed(supabase, data);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(supabase, data);
        break;

      default:
        console.log("[mayar webhook] Unhandled event type:", event);
    }

    // 7. Store event for idempotency tracking
    await storeWebhookEvent(supabase, eventId, event, payload);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[mayar webhook] Processing failed:", error);
    // Return 500 so Mayar retries
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
