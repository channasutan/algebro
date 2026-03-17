import "server-only";

import { getAiProviderApiKey } from "@/config/env.server-entry";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiContentPart = {
  text: string;
};

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiContentPart[];
};

export type GeminiGenerateContentInput = {
  model: string;
  contents: GeminiContent[];
  signal?: AbortSignal;
};

export type GeminiGenerateContentResponse = {
  candidates?: Array<Record<string, unknown>>;
  promptFeedback?: Record<string, unknown>;
};

function isConfigured(): boolean {
  try {
    return Boolean(getAiProviderApiKey()?.trim());
  } catch (err) {
    console.warn("[gemini-client] Failed to get API key, returning false");
    return false;
  }
}

async function generateContent(
  input: GeminiGenerateContentInput
): Promise<GeminiGenerateContentResponse> {
  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${input.model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getAiProviderApiKey()
    },
    body: JSON.stringify({ contents: input.contents }),
    signal: input.signal
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  return (await response.json()) as GeminiGenerateContentResponse;
}

export const geminiClient = {
  isConfigured,
  generateContent
};
