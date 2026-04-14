import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMayarWebhookSecret } from "@/config/env.server-entry";
import { handleMayarWebhook, type MayarWebhookData } from "@/lib/services/api-route-service";

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
    data: MayarWebhookData;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[mayar webhook] Invalid JSON payload");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = payload;
  const eventId = `${event}:${data.id}`;

  // 5. Process webhook using billing service
  try {
    const result = await handleMayarWebhook(eventId, event, payload);

    if (result.duplicate) {
      console.log("[mayar webhook] Duplicate event, acknowledging without reprocessing:", eventId);
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[mayar webhook] Processing failed:", error);
    // Return 500 so Mayar retries
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
