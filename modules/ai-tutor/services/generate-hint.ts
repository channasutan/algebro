import "server-only";

import { AI_HINT_REQUESTED } from "@/events/ai-hint-events";
import { eventBus } from "@/events/event-bus";
import { createDomainEvent } from "@/events/event-types";
import { geminiClient } from "@/infrastructure/ai/gemini-client";
import type { GeminiGenerateContentResponse } from "@/infrastructure/ai/gemini-client";

import type { GenerateHintInput, GenerateHintResult } from "../contracts/generate-hint";
import { buildHintPrompt } from "../domain/hint-prompt";
import type { AiTutorRepository } from "../repositories/ai-tutor-repository";
import { createSupabaseAiTutorRepository } from "../repositories/supabase-ai-tutor-repository";
import { checkHintQuotaWithRepository } from "./check-hint-quota";

const BLOCKED_HINT_MESSAGE = "I'm unable to provide a hint for this content.";
const HINT_MAX_LENGTH = 500;
const GEMINI_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateHint(
  input: GenerateHintInput
): Promise<GenerateHintResult> {
  return generateHintWithRepository(createSupabaseAiTutorRepository(), input);
}

export async function generateHintWithRepository(
  repo: AiTutorRepository,
  input: GenerateHintInput
): Promise<GenerateHintResult> {
  if (input.requestId) {
    console.debug("[ai-tutor] generateHint called", { requestId: input.requestId });
  }

  const quotaResult = await checkHintQuotaWithRepository(repo, {
    userId: input.userId,
    problemId: input.problemId,
  });

  if (!quotaResult.allowed) {
    return { success: false, reason: "quota_exceeded" };
  }

  const contents = buildHintPrompt({
    problemDescription: input.problemLatex,
    studentAnswer: input.studentStepLatex,
    hintIndex: input.hintCount,
  });

  const geminiResult = await callGeminiWithTimeout(contents);
  if (!geminiResult.success) {
    return { success: false, reason: "ai_unavailable" };
  }

  const hintResult = extractHintFromResponse(geminiResult.response);
  if (!hintResult.success) {
    return hintResult;
  }

  // Don't increment/publish for blocked content - it's a safety fallback, not a real hint
  if (hintResult.hint === BLOCKED_HINT_MESSAGE) {
    return hintResult;
  }

  await repo.incrementHintUsage(input.userId, input.problemId);
  publishHintRequestedEvent(input);

  return { success: true, hint: hintResult.hint };
}

// ---------------------------------------------------------------------------
// Private helpers — each handles exactly one concern
// ---------------------------------------------------------------------------

type GeminiCallResult =
  | { success: true; response: GeminiGenerateContentResponse }
  | { success: false };

async function callGeminiWithTimeout(
  contents: ReturnType<typeof buildHintPrompt>
): Promise<GeminiCallResult> {
  try {
    const response = await geminiClient.generateContent({
      model: "gemini-2.0-flash",
      contents,
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
    return { success: true, response };
  } catch {
    return { success: false };
  }
}

function extractHintFromResponse(response: GeminiGenerateContentResponse): GenerateHintResult {
  // Check block reason first (before candidates check)
  if (response.promptFeedback?.blockReason) {
    return { success: true, hint: BLOCKED_HINT_MESSAGE };
  }

  if (!response.candidates || response.candidates.length === 0) {
    return { success: false, reason: "ai_unavailable" };
  }

  const rawText = extractTextFromCandidates(response.candidates);
  const hint = rawText.slice(0, HINT_MAX_LENGTH).trim();

  if (!hint) {
    return { success: false, reason: "ai_unavailable" };
  }

  return { success: true, hint };
}

function publishHintRequestedEvent(input: GenerateHintInput): void {
  const event = createDomainEvent({
    eventType: AI_HINT_REQUESTED,
    payload: {
      userId: input.userId,
      problemId: input.problemId,
      hintCount: input.hintCount + 1,
      requestedAt: new Date().toISOString(),
    },
  });

  void eventBus.publish(event).catch(() => {
    // fire-and-forget: event emission must never block hint delivery
  });
}

function extractTextFromCandidates(
  candidates: NonNullable<GeminiGenerateContentResponse["candidates"]>
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (candidates[0] as any)?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text : "";
}