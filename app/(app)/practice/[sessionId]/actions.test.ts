import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/bootstrap", () => ({
  ensureModulesBootstrapped: vi.fn(),
}));
vi.mock("@/modules/ai-tutor", () => ({
  generateHint: vi.fn(),
}));
vi.mock("@/modules/authentication", () => ({
  getCurrentSession: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({
  getRequestId: vi.fn(),
}));

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { generateHint } from "@/modules/ai-tutor";
import { getCurrentSession } from "@/modules/authentication";
import { getRequestId } from "@/lib/observability";
import { generateHintAction } from "./actions";
import type { GenerateHintResult } from "@/modules/ai-tutor/contracts/generate-hint";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runAction(attemptId = "attempt-1", stepIndex = 0) {
  return generateHintAction(attemptId, stepIndex, null, new FormData());
}

function expectBootstrapBeforeHint() {
  expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
  expect(generateHint).toHaveBeenCalledTimes(1);
  expect(
    vi.mocked(ensureModulesBootstrapped).mock.invocationCallOrder[0]
  ).toBeLessThan(vi.mocked(generateHint).mock.invocationCallOrder[0]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateHintAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureModulesBootstrapped).mockResolvedValue(undefined);
    vi.mocked(getRequestId).mockResolvedValue("req-1");
    vi.mocked(getCurrentSession).mockResolvedValue({
      session: { isAuthenticated: true, userId: "u1", email: "u1@example.com" },
    });
  });

  it("happy path returns hint status and calls bootstrap before ai-tutor module", async () => {
    vi.mocked(generateHint).mockResolvedValueOnce({ success: true, hint: "Try factoring..." });

    const result = await runAction("attempt-1", 0);

    expect(result).toEqual({ status: "hint", hint: "Try factoring..." });
    expectBootstrapBeforeHint();
  });

  it("quota exceeded returns quota_exceeded status and preserves call order", async () => {
    vi.mocked(generateHint).mockResolvedValueOnce({ success: false, reason: "quota_exceeded" } as GenerateHintResult);

    const result = await runAction("attempt-1", 1);

    expect(result).toEqual({ status: "quota_exceeded", remaining: 0 });
    expectBootstrapBeforeHint();
  });

  it("ai unavailable returns ai_unavailable when ai-tutor throws", async () => {
    vi.mocked(generateHint).mockRejectedValueOnce(new Error("ai down"));

    const result = await runAction("attempt-1", 2);

    expect(result).toEqual({ status: "ai_unavailable" });
    expect(generateHint).toHaveBeenCalledTimes(1);
  });

  it("validation error returns validation_error for empty attemptId when unauthenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValueOnce({ session: null });

    const result = await runAction("", 0);

    expect(result).toEqual({ status: "validation_error" });
    expect(generateHint).not.toHaveBeenCalled();
  });
});