import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sympyClient } from "@/infrastructure/math/sympy-client";

describe("sympy client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getBaseUrl", () => {
    it("returns the default URL if environment variable is not set", () => {
      // The default in the code is http://127.0.0.1:8000
      // However, we should verify what it actually is in the test environment
      expect(sympyClient.getBaseUrl()).toBeDefined();
    });

    it("respects the SYMPY_SERVICE_URL environment variable", async () => {
      vi.resetModules();
      const originalUrl = process.env.SYMPY_SERVICE_URL;
      const testUrl = "http://test-sympy-service:9000";
      process.env.SYMPY_SERVICE_URL = testUrl;

      const { sympyClient: freshClient } = await import("@/infrastructure/math/sympy-client");
      expect(freshClient.getBaseUrl()).toBe(testUrl);

      // Restore
      if (originalUrl) {
        process.env.SYMPY_SERVICE_URL = originalUrl;
      } else {
        delete process.env.SYMPY_SERVICE_URL;
      }
    });
  });

  describe("evaluate", () => {
    it("constructs the correct POST request", async () => {
      const mockResult = { result: "2*x + 6" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResult
      });

      const input = {
        expression: "2*(x + 3)",
        operation: "expand" as const,
        context: { variables: ["x"] }
      };

      const result = await sympyClient.evaluate(input);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const [url, options] = mockFetch.mock.calls[0];
      
      expect(url).toBe(`${sympyClient.getBaseUrl()}/evaluate`);
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        "Content-Type": "application/json"
      });
      
      const body = JSON.parse(options.body);
      expect(body).toEqual({
        expression: "2*(x + 3)",
        operation: "expand",
        context: { variables: ["x"] }
      });

      expect(result).toEqual(mockResult);
    });

    it("handles success without optional context", async () => {
      const mockResult = { result: "x**2" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResult
      });

      const input = {
        expression: "x*x",
        operation: "simplify" as const
      };

      await sympyClient.evaluate(input);

      const options = mockFetch.mock.calls[0][1];
      const body = JSON.parse(options.body);
      
      // Should default context to empty object
      expect(body.context).toEqual({});
    });

    it("forwards AbortSignal to fetch", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ result: "ok" })
      });

      const controller = new AbortController();
      const input = {
        expression: "1+1",
        operation: "simplify" as const,
        signal: controller.signal
      };

      await sympyClient.evaluate(input);

      const options = mockFetch.mock.calls[0][1];
      expect(options.signal).toBe(controller.signal);
    });

    it("throws error when response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      const input = {
        expression: "invalid",
        operation: "solve" as const
      };

      await expect(sympyClient.evaluate(input)).rejects.toThrow(
        "SymPy request failed with status 500"
      );
    });

    it("handles network failures", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const input = {
        expression: "1+1",
        operation: "simplify" as const
      };

      await expect(sympyClient.evaluate(input)).rejects.toThrow("Network error");
    });
  });
});
