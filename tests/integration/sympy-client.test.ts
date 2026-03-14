import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sympyClient } from "@/infrastructure/math/sympy-client";

describe("sympy client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getBaseUrl", () => {
    it("returns the default URL if environment variable is not set", async () => {
      const originalUrl = process.env.SYMPY_SERVICE_URL;
      
      try {
        // Ensure env variable is unset to test default behavior
        delete process.env.SYMPY_SERVICE_URL;
        
        // Reset modules to ensure fresh import picks up the unset env
        vi.resetModules();
        
        const { sympyClient: freshClient } = await import("@/infrastructure/math/sympy-client");
        expect(freshClient.getBaseUrl()).toBe("http://127.0.0.1:8000");
      } finally {
        // Restore original value
        if (originalUrl !== undefined) {
          process.env.SYMPY_SERVICE_URL = originalUrl;
        } else {
          delete process.env.SYMPY_SERVICE_URL;
        }
      }
    });

    it("respects the SYMPY_SERVICE_URL environment variable", async () => {
      const originalUrl = process.env.SYMPY_SERVICE_URL;
      const testUrl = "http://test-sympy-service:9000";
      
      try {
        process.env.SYMPY_SERVICE_URL = testUrl;
        vi.resetModules();

        const { sympyClient: freshClient } = await import("@/infrastructure/math/sympy-client");
        expect(freshClient.getBaseUrl()).toBe(testUrl);
      } finally {
        // Restore original value
        if (originalUrl !== undefined) {
          process.env.SYMPY_SERVICE_URL = originalUrl;
        } else {
          delete process.env.SYMPY_SERVICE_URL;
        }
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
      expect(options.headers["Content-Type"]).toBe("application/json");
      
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
