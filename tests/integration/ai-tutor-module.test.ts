import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/modules/billing", () => ({
  checkFeatureAccess: vi.fn().mockResolvedValue({ allowed: true, planTier: "free" })
}));

vi.mock("@/config/env.server-entry", () => ({
  getFreeHintLimit: vi.fn().mockReturnValue(3)
}));

vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn()
  }
}));

vi.mock("@/infrastructure/ai/gemini-client", () => ({
  geminiClient: {
    generateContent: vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: "Try simplifying the left side first." }] } }],
      promptFeedback: {}
    })
  }
}));

import { eventBus } from "@/events/event-bus";
import { geminiClient } from "@/infrastructure/ai/gemini-client";
import type { GenerateHintInput } from "@/modules/ai-tutor/contracts/generate-hint";
import type { AiTutorRepository } from "@/modules/ai-tutor/repositories/ai-tutor-repository";
import { generateHintWithRepository } from "@/modules/ai-tutor/services/generate-hint";

function makeRepo(hintCount = 1): AiTutorRepository {
  return {
    getHintUsage: vi.fn().mockResolvedValue(hintCount),
    incrementHintUsage: vi.fn().mockResolvedValue(undefined)
  };
}

function makeInput(): GenerateHintInput {
  return {
    userId: "user-1",
    problemId: "problem-1",
    problemLatex: "x^2-4=0",
    studentStepLatex: "x=2",
    errorType: null,
    previousStepsLatex: [],
    hintCount: 0
  };
}

describe("generateHint — full lifecycle integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(geminiClient.generateContent).mockResolvedValue({
      candidates: [{ content: { parts: [{ text: "Try simplifying the left side first." }] } }],
      promptFeedback: {}
    });
    vi.mocked(eventBus.publish).mockResolvedValue(undefined);
  });

  it("returns { success: true, hint } on happy path", async () => {
    const repo = makeRepo(1);

    const result = await generateHintWithRepository(repo, makeInput());

    expect(result).toEqual({ success: true, hint: expect.any(String) });
    if (result.success) {
      expect(result.hint.length).toBeGreaterThan(0);
    }
  });

  it("increments ai_hint_usage exactly once", async () => {
    const repo = makeRepo(1);

    await generateHintWithRepository(repo, makeInput());

    expect(repo.incrementHintUsage).toHaveBeenCalledTimes(1);
  });

  it("emits ai_hint_requested exactly once with correct payload envelope", async () => {
    const repo = makeRepo(1);

    await generateHintWithRepository(repo, makeInput());

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "ai_hint_requested"
      })
    );
  });

  it("published event payload contains userId and problemId context", async () => {
    const repo = makeRepo(1);

    await generateHintWithRepository(repo, makeInput());

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          userId: "user-1",
          problemId: "problem-1",
          hintCount: 1
        })
      })
    );
  });
});
