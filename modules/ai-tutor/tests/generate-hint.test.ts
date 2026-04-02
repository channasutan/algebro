import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateHintWithRepository } from "../services/generate-hint";
import type { AiTutorRepository } from "../repositories/ai-tutor-repository";

vi.mock("server-only", () => ({}));

vi.mock("@/modules/billing", () => ({
  checkFeatureAccess: vi.fn().mockResolvedValue({ allowed: true, planTier: "free" }),
}));

vi.mock("@/config/env.server-entry", () => ({
  getFreeHintLimit: vi.fn().mockReturnValue(3),
}));

vi.mock("@/infrastructure/ai/gemini-client", () => ({
  geminiClient: {
    generateContent: vi.fn(),
    isConfigured: vi.fn().mockReturnValue(true),
  },
}));

vi.mock("@/events/event-bus", () => ({
  eventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}));

import { geminiClient } from "@/infrastructure/ai/gemini-client";
import { eventBus } from "@/events/event-bus";

function makeMockRepo(hintCount = 1): AiTutorRepository {
  return {
    getHintUsage: vi.fn().mockResolvedValue(hintCount),
    incrementHintUsage: vi.fn().mockResolvedValue(undefined),
  };
}

function makeGeminiResponse(text: string) {
  return {
    candidates: [{ content: { parts: [{ text }] } }],
    promptFeedback: {},
  };
}

describe("generateHintWithRepository", () => {
  beforeEach(() => {
    vi.mocked(geminiClient.generateContent).mockReset();
    vi.mocked(eventBus.publish).mockClear();
  });

  it("returns success hint, increments usage, and publishes event on happy path", async () => {
    const repo = makeMockRepo(1);
    vi.mocked(geminiClient.generateContent).mockResolvedValueOnce(
      makeGeminiResponse("Try factoring the expression.")
    );

    const result = await generateHintWithRepository(repo, {
      userId: "u1",
      problemId: "p1",
      problemLatex: "Solve x^2-4",
      studentStepLatex: "x=2",
      errorType: null,
      previousStepsLatex: [],
      hintCount: 0,
    });

    expect(result).toEqual({ success: true, hint: "Try factoring the expression." });
    expect(repo.incrementHintUsage).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it("returns quota_exceeded and does not call Gemini when at free limit", async () => {
    const repo = makeMockRepo(3);

    const result = await generateHintWithRepository(repo, {
      userId: "u1",
      problemId: "p1",
      problemLatex: "Solve x^2-4",
      studentStepLatex: "x=2",
      errorType: null,
      previousStepsLatex: [],
      hintCount: 0,
    });

    expect(result).toEqual({ success: false, reason: "quota_exceeded" });
    expect(geminiClient.generateContent).not.toHaveBeenCalled();
    expect(repo.incrementHintUsage).not.toHaveBeenCalled();
  });

  it("returns ai_unavailable when Gemini call times out", async () => {
    const repo = makeMockRepo(1);
    vi.mocked(geminiClient.generateContent).mockRejectedValueOnce(
      new DOMException("Aborted", "AbortError")
    );

    const result = await generateHintWithRepository(repo, {
      userId: "u1",
      problemId: "p1",
      problemLatex: "Solve x^2-4",
      studentStepLatex: "x=2",
      errorType: null,
      previousStepsLatex: [],
      hintCount: 0,
    });

    expect(result).toEqual({ success: false, reason: "ai_unavailable" });
    expect(repo.incrementHintUsage).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("returns safety fallback hint when Gemini blocks content", async () => {
    const repo = makeMockRepo(1);
    vi.mocked(geminiClient.generateContent).mockResolvedValueOnce({
      candidates: [],
      promptFeedback: { blockReason: "SAFETY" },
    });

    const result = await generateHintWithRepository(repo, {
      userId: "u1",
      problemId: "p1",
      problemLatex: "Solve x^2-4",
      studentStepLatex: "x=2",
      errorType: null,
      previousStepsLatex: [],
      hintCount: 0,
    });

    expect(result).toEqual({
      success: true,
      hint: "I'm unable to provide a hint for this content.",
    });
    expect(repo.incrementHintUsage).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("increments hint usage with correct userId and problemId", async () => {
    const repo = makeMockRepo(1);
    vi.mocked(geminiClient.generateContent).mockResolvedValueOnce(
      makeGeminiResponse("Try factoring the expression.")
    );

    await generateHintWithRepository(repo, {
      userId: "u1",
      problemId: "p1",
      problemLatex: "Solve x^2-4",
      studentStepLatex: "x=2",
      errorType: null,
      previousStepsLatex: [],
      hintCount: 0,
    });

    expect(repo.incrementHintUsage).toHaveBeenCalledWith("u1", "p1");
  });
});
