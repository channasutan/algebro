import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateHintInput } from "@/modules/ai-tutor/contracts/generate-hint";

vi.mock("server-only", () => ({}));
vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  },
}));
vi.mock("@/infrastructure/ai/gemini-client", () => ({
  geminiClient: {
    generateContent: vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: "Fixed hint text." }] } }],
      promptFeedback: {},
    }),
    isConfigured: vi.fn().mockReturnValue(true),
  },
}));
vi.mock("@/modules/billing", () => ({
  checkFeatureAccess: vi.fn(),
}));
vi.mock("@/config/env.server-entry", () => ({
  getFreeHintLimit: vi.fn().mockReturnValue(3),
}));

const { getHintUsageMock, incrementHintUsageMock } = vi.hoisted(() => ({
  getHintUsageMock: vi.fn(),
  incrementHintUsageMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/ai-tutor/repositories/supabase-ai-tutor-repository", () => ({
  createSupabaseAiTutorRepository: vi.fn(() => ({
    getHintUsage: getHintUsageMock,
    incrementHintUsage: incrementHintUsageMock,
  })),
}));

import { eventBus } from "@/events/event-bus";
import { geminiClient } from "@/infrastructure/ai/gemini-client";
import { generateHint } from "@/modules/ai-tutor";
import { checkFeatureAccess } from "@/modules/billing";

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------

function makeQuotaInput(overrides: Partial<GenerateHintInput> = {}): GenerateHintInput {
  return {
    userId: "user-1",
    problemId: "problem-1",
    problemLatex: "x^2-4=0",
    studentStepLatex: "x=2",
    errorType: null,
    previousStepsLatex: [],
    hintCount: 0,
    ...overrides,
  };
}

type PlanTier = "free" | "premium";

function setupQuota(planTier: PlanTier, usageCount: number) {
  vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier });
  getHintUsageMock.mockResolvedValue(usageCount);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateHint — quota boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(geminiClient.generateContent).mockResolvedValue({
      candidates: [{ content: { parts: [{ text: "Fixed hint text." }] } }],
      promptFeedback: {},
    });
    vi.mocked(eventBus.publish).mockResolvedValue(undefined);
    incrementHintUsageMock.mockResolvedValue(undefined);
  });

  it("hint 3 (last free slot) succeeds for free-tier user", async () => {
    setupQuota("free", 2); // remainingQuota = 1 when limit = 3

    const result = await generateHint(makeQuotaInput({ hintCount: 2 }));

    expect(result).toMatchObject({ success: true });
    if (result.success) expect(result.hint.length).toBeGreaterThan(0);
    expect(incrementHintUsageMock).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("hint 4 (over limit) returns quota_exceeded for free-tier user", async () => {
    setupQuota("free", 3); // remainingQuota = 0 when limit = 3

    const result = await generateHint(makeQuotaInput({ hintCount: 3 }));

    expect(result).toMatchObject({ success: false, reason: "quota_exceeded" });
    expect(vi.mocked(geminiClient.generateContent)).not.toHaveBeenCalled();
    expect(incrementHintUsageMock).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("paid-tier user with 0 remaining quota is NOT blocked", async () => {
    setupQuota("premium", 999); // usage count irrelevant for paid tier

    const result = await generateHint(makeQuotaInput({ userId: "user-2", hintCount: 3 }));

    expect(result).toMatchObject({ success: true });
    expect(getHintUsageMock).not.toHaveBeenCalled();
    expect(incrementHintUsageMock).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });
});