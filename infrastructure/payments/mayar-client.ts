import "server-only";

import { getMayarApiKey, getMayarWebhookSecret } from "@/config/env.server-entry";

const DEFAULT_MAYAR_API_BASE_URL = process.env.MAYAR_API_BASE_URL ?? "https://api.mayar.id";

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
  const response = await fetch(`${DEFAULT_MAYAR_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMayarApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Mayar request failed with status ${response.status}`);
  }

  return (await response.json()) as MayarApiResponse;
}

function isConfigured(): boolean {
  return Boolean(process.env.MAYAR_API_KEY?.trim() && process.env.MAYAR_WEBHOOK_SECRET?.trim());
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
  return mayarRequest(`/payments/${providerPaymentId}`, {
    method: "GET"
  });
}

export const mayarClient = {
  isConfigured,
  createCheckoutSession,
  getPayment,
  getWebhookSecret: getMayarWebhookSecret
};
