import "server-only";

import { AI_HINT_REQUESTED } from "@/events/ai-hint-events";
import { eventBus } from "@/events/event-bus";
import { createDomainEvent } from "@/events/event-types";
import { geminiClient } from "@/infrastructure/ai/gemini-client";

import type { GenerateHintInput, GenerateHintResult } from "../contracts/generate-hint";
import { buildHintPrompt } from "../domain/hint-prompt";
import type { AiTutorRepository } from "../repositories/ai-tutor-repository";
import { createSupabaseAiTutorRepository } from "../repositories/supabase-ai-tutor-repository";
import { checkHintQuotaWithRepository } from "./check-hint-quota";

const BLOCKED_HINT_MESSAGE = "I'm unable to provide a hint for this content.";

export async function generateHint(
  input: GenerateHintInput
): Promise<GenerateHintResult> {
  return generateHintWithRepository(createSupabaseAiTutorRepository(), input);
}

export async function generateHintWithRepository(
  repo: AiTutorRepository,
  input: GenerateHintInput
): Promise<GenerateHintResult> {
  // Log requestId for tracing if provided
  if (input.requestId) {
    console.debug("[ai-tutor] generateHint called", { requestId: input.requestId });
  }

  const quotaResult = await checkHintQuotaWithRepository(repo, {
    userId: input.userId,
    problemId: input.problemId,
  });

  if (!quotaResult.allowed) {
    // feature_not_allowed and quota_exceeded both map to quota_exceeded for the UI
    // since both cases result in the same user-facing behavior (hint unavailable)
    return { success: false, reason: "quota_exceeded" };
  }

  const contents = buildHintPrompt({
    problemDescription: input.problemLatex,
    studentAnswer: input.studentStepLatex,
    hintIndex: input.hintCount,
  });

  let response: Awaited<ReturnType<typeof geminiClient.generateContent>>;
  try {
    const result = await geminiClient.generateContent({
      model: "gemini-2.0-flash",
      contents,
      signal: AbortSignal.timeout(10_000),
    });
    response = result;
  } catch {
    return { success: false, reason: "ai_unavailable" };
  }

  if (!response.candidates || response.candidates.length === 0) {
    if (response.promptFeedback?.blockReason) {
      return { success: true, hint: BLOCKED_HINT_MESSAGE };
    }
    return { success: false, reason: "ai_unavailable" };
  }

  if (response.promptFeedback?.blockReason) {
    return { success: true, hint: BLOCKED_HINT_MESSAGE };
  }

  const rawText = extractHintText(response.candidates);
  const hint = rawText.slice(0, 500).trim();

  if (!hint) {
    return { success: false, reason: "ai_unavailable" };
  }

  await repo.incrementHintUsage(input.userId, input.problemId);

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
    // fire-and-forget: event emission should not block hint delivery
  });

  return { success: true, hint };
}

function extractHintText(candidates: Array<Record<string, unknown>>): string {
  const firstCandidate = candidates[0];
  if (!firstCandidate || typeof firstCandidate !== "object") {
    return "";
  }

  const content = (firstCandidate as { content?: unknown }).content;
  if (!content || typeof content !== "object") {
    return "";
  }

  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return "";
  }

  const firstPart = parts[0];
  if (!firstPart || typeof firstPart !== "object") {
    return "";
  }

  const text = (firstPart as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}
