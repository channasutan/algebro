import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mayarClient } from "@/infrastructure/payments/mayar-client";

describe("mayar client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("isConfigured", () => {
    it("returns true when required environment variables are present", () => {
      // Test environment has MAYAR_API_KEY and MAYAR_WEBHOOK_SECRET set in tests/setup.ts
      const result = mayarClient.isConfigured();
      expect(result).toBe(true);
    });

    it("returns false when MAYAR_API_KEY is missing", async () => {
      vi.resetModules();
      const originalKey = process.env.MAYAR_API_KEY;
      delete process.env.MAYAR_API_KEY;

      const { mayarClient: freshClient } = await import("@/infrastructure/payments/mayar-client");
      const result = freshClient.isConfigured();

      process.env.MAYAR_API_KEY = originalKey;
      expect(result).toBe(false);
    });

    it("returns false when MAYAR_WEBHOOK_SECRET is missing", async () => {
      vi.resetModules();
      const originalSecret = process.env.MAYAR_WEBHOOK_SECRET;
      delete process.env.MAYAR_WEBHOOK_SECRET;

      const { mayarClient: freshClient } = await import("@/infrastructure/payments/mayar-client");
      const result = freshClient.isConfigured();

      process.env.MAYAR_WEBHOOK_SECRET = originalSecret;
      expect(result).toBe(false);
    });
  });

  describe("createCheckoutSession", () => {
    const input = {
      externalId: "test-id",
      amount: 10000,
      currency: "IDR",
      customerEmail: "test@example.com",
      customerName: "Test User",
      items: [{ name: "Test Item", quantity: 1, price: 10000 }],
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel"
    };

    it("constructs the correct API request", async () => {
      const mockResponse = { id: "session-123" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mayarClient.createCheckoutSession(input);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://api.mayar.id/checkout-sessions");
      expect(options.method).toBe("POST");
      expect(options.headers.get("Authorization")).toBe("Bearer test-mayar-key");
      expect(options.headers.get("Content-Type")).toBe("application/json");
      expect(JSON.parse(options.body as string)).toEqual({
        externalId: input.externalId,
        amount: input.amount,
        currency: input.currency,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        items: input.items,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl
      });
      expect(result).toEqual(mockResponse);
    });

    it("forwards AbortSignal to fetch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const controller = new AbortController();
      await mayarClient.createCheckoutSession({ ...input, signal: controller.signal });

      const options = mockFetch.mock.calls[0][1];
      expect(options.signal).toBe(controller.signal);
    });

    it("throws an error when response.ok is false", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401
      });

      await expect(mayarClient.createCheckoutSession(input)).rejects.toThrow(
        "Mayar request failed with status 401"
      );
    });

    it("propagates network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      await expect(mayarClient.createCheckoutSession(input)).rejects.toThrow("Network failure");
    });
  });

  describe("getPayment", () => {
    it("constructs the correct API request", async () => {
      const mockResponse = { id: "payment-123", status: "success" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mayarClient.getPayment("payment-123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://api.mayar.id/payments/payment-123");
      expect(options.method).toBe("GET");
      expect(options.headers.get("Authorization")).toBe("Bearer test-mayar-key");
      expect(result).toEqual(mockResponse);
    });

    it("encodes the payment id in the URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await mayarClient.getPayment("pay/123");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toBe("https://api.mayar.id/payments/pay%2F123");
    });

    it("throws an error when response.ok is false", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      await expect(mayarClient.getPayment("non-existent")).rejects.toThrow(
        "Mayar request failed with status 404"
      );
    });
  });

  describe("getWebhookSecret", () => {
    it("returns the webhook secret from the server environment", () => {
      const secret = mayarClient.getWebhookSecret();
      expect(secret).toBe("test-webhook-secret");
    });
  });
});
