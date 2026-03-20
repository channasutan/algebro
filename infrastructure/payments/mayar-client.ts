import "server-only";

import { getPublicEnv, getMayarApiBaseUrl, getMayarApiKey, getMayarWebhookSecret } from "@/config/env.server-entry";

export type MayarCheckoutItem = {
  name: string;
  quantity: number;
  price: number;
};

export type MayarCheckoutSessionInput = {
  externalId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  items?: MayarCheckoutItem[];
  successUrl?: string;
  cancelUrl?: string;
  signal?: AbortSignal;
};

type MayarApiResponse = Record<string, unknown>;

async function mayarRequest(path: string, init: RequestInit = {}): Promise<MayarApiResponse> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getMayarApiKey()}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${getMayarApiBaseUrl()}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`Mayar request failed with status ${response.status}`);
  }

  return (await response.json()) as MayarApiResponse;
}

function isConfigured(): boolean {
  try {
    const apiKey = getMayarApiKey();
    const webhookSecret = getMayarWebhookSecret();
    return Boolean(apiKey && webhookSecret);
  } catch {
    if (getPublicEnv().nodeEnv !== "production") {
      console.warn("[mayar-client] Failed to verify configuration, returning false");
    }
    return false;
  }
}

async function createCheckoutSession(
  input: MayarCheckoutSessionInput
): Promise<MayarApiResponse> {
  return mayarRequest("/checkout-sessions", {
    method: "POST",
    body: JSON.stringify({
      externalId: input.externalId,
      amount: input.amount,
      currency: input.currency,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      items: input.items ?? [],
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    }),
    signal: input.signal
  });
}

async function getPayment(providerPaymentId: string): Promise<MayarApiResponse> {
  return mayarRequest(`/payments/${encodeURIComponent(providerPaymentId)}`, {
    method: "GET"
  });
}

export const mayarClient = {
  isConfigured,
  createCheckoutSession,
  getPayment,
  getWebhookSecret: getMayarWebhookSecret
};
