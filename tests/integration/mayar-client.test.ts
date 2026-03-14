import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mayarClient } from "@/infrastructure/payments/mayar-client";

const TEST_API_KEY = "test-mayar-key";
const TEST_WEBHOOK_SECRET = "test-webhook-secret";

/**
 * Helper to test isConfigured with a missing environment variable.
 * This refactors repeated env mutation logic used in tests.
 */
async function withMissingEnvVar(
  envVar: string,
  callback: (freshClient: typeof mayarClient) => void
): Promise<void> {
  const original = process.env[envVar];
  delete process.env[envVar];

  vi.resetModules();

  const { mayarClient: freshClient } = await import("@/infrastructure/payments/mayar-client");
  callback(freshClient);

  if (original !== undefined) {
    process.env[envVar] = original;
  } else {
    delete process.env[envVar];
  }
}

/**
 * Helper to run tests with specific environment variables set.
 * Ensures environment is restored properly after test.
 */
async function withTestEnvVars(
  envVars: Record<string, string>,
  callback: () => Promise<void>
): Promise<void> {
  const originals: Record<string, string | undefined> = {};

  for (const key of Object.keys(envVars)) {
    originals[key] = process.env[key];
  }

  try {
    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
    }
    vi.resetModules();

    // Re-import the module with fresh env
    await import("@/infrastructure/payments/mayar-client");

    await callback();
  } finally {
    for (const key of Object.keys(envVars)) {
      const original = originals[key];
      if (original !== undefined) {
        process.env[key] = original;
      } else {
        delete process.env[key];
      }
    }
  }
}

describe("mayar client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();

    // Ensure test environment variables are set
    process.env.MAYAR_API_KEY = TEST_API_KEY;
    process.env.MAYAR_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();

    // Clean up env vars if they were modified
    const originalKey = process.env.MAYAR_API_KEY;
    if (originalKey !== TEST_API_KEY) {
      if (originalKey !== undefined) {
        process.env.MAYAR_API_KEY = originalKey;
      } else {
        delete process.env.MAYAR_API_KEY;
      }
    }

    const originalSecret = process.env.MAYAR_WEBHOOK_SECRET;
    if (originalSecret !== TEST_WEBHOOK_SECRET) {
      if (originalSecret !== undefined) {
        process.env.MAYAR_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.MAYAR_WEBHOOK_SECRET;
      }
    }
  });

  describe("isConfigured", () => {
    it("returns true when required environment variables are present", () => {
      const result = mayarClient.isConfigured();
      expect(result).toBe(true);
    });

    it("returns false when MAYAR_API_KEY is missing", async () => {
      await withMissingEnvVar("MAYAR_API_KEY", (freshClient) => {
        const result = freshClient.isConfigured();
        expect(result).toBe(false);
      });
    });

    it("returns false when MAYAR_WEBHOOK_SECRET is missing", async () => {
      await withMissingEnvVar("MAYAR_WEBHOOK_SECRET", (freshClient) => {
        const result = freshClient.isConfigured();
        expect(result).toBe(false);
      });
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
      expect(options.headers.get("Authorization")).toBe(`Bearer ${TEST_API_KEY}`);
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

      expect(mockFetch).toHaveBeenCalledTimes(1);
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
      expect(options.headers.get("Authorization")).toBe(`Bearer ${TEST_API_KEY}`);
      expect(result).toEqual(mockResponse);
    });

    it("encodes the payment id in the URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await mayarClient.getPayment("pay/123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
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
      expect(secret).toBe(TEST_WEBHOOK_SECRET);
    });
  });
});
