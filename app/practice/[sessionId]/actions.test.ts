import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/modules/bootstrap", () => ({
  ensureModulesBootstrapped: vi.fn()
}));

vi.mock("@/modules/ai-tutor", () => ({
  generateHint: vi.fn()
}));

vi.mock("@/modules/authentication", () => ({
  getCurrentSession: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  getRequestId: vi.fn()
}));

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { generateHint } from "@/modules/ai-tutor";
import { getCurrentSession } from "@/modules/authentication";
import { getRequestId } from "@/lib/observability";
import { generateHintAction } from "./actions";

describe("generateHintAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureModulesBootstrapped).mockResolvedValue(undefined);
    vi.mocked(getRequestId).mockResolvedValue("req-1");
    vi.mocked(getCurrentSession).mockResolvedValue({
      session: {
        isAuthenticated: true,
        userId: "u1",
        email: "u1@example.com"
      }
    });
  });

  it("happy path returns hint status and calls bootstrap before ai-tutor module", async () => {
    vi.mocked(generateHint).mockResolvedValueOnce({
      success: true,
      hint: "Try factoring..."
    });

    const result = await generateHintAction("attempt-1", 0, null, new FormData());

    expect(result).toEqual({ status: "hint", hint: "Try factoring..." });
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
    expect(generateHint).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(ensureModulesBootstrapped).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(generateHint).mock.invocationCallOrder[0]);
  });

  it("quota exceeded returns quota_exceeded status and preserves call order", async () => {
    vi.mocked(generateHint).mockResolvedValueOnce({
      success: false,
      reason: "quota_exceeded"
    });

    const result = await generateHintAction("attempt-1", 1, null, new FormData());

    expect(result).toEqual({ status: "quota_exceeded" });
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
    expect(generateHint).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(ensureModulesBootstrapped).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(generateHint).mock.invocationCallOrder[0]);
  });

  it("ai unavailable returns ai_unavailable when ai-tutor throws", async () => {
    vi.mocked(generateHint).mockRejectedValueOnce(new Error("ai down"));

    const result = await generateHintAction("attempt-1", 2, null, new FormData());

    expect(result).toEqual({ status: "ai_unavailable" });
    expect(generateHint).toHaveBeenCalledTimes(1);
  });

  it("validation error returns validation_error for empty attemptId when unauthenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValueOnce({
      session: null
    });

    const result = await generateHintAction("", 0, null, new FormData());

    expect(result).toEqual({ status: "validation_error" });
    expect(generateHint).not.toHaveBeenCalled();
  });
});
