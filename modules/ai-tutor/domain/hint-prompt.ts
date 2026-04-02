import type { GeminiContent } from "@/infrastructure/ai/gemini-client";

export type HintPromptInput = {
  problemDescription: string;
  studentAnswer: string;
  hintIndex: number; // 0-based: 0 = first hint, 1 = second, 2 = third+
};

const HINT_INSTRUCTIONS: Record<number, string> = {
  0: "Give the student a subtle directional nudge. Do NOT solve the problem or reveal the answer.",
  1: "Give a more specific hint — point to the relevant step or concept they are missing. Do NOT give the final answer.",
};

function getHintInstruction(hintIndex: number): string {
  return (
    HINT_INSTRUCTIONS[hintIndex] ??
    "Explain the approach clearly and directly. Do NOT give the final answer."
  );
}

export function buildHintPrompt(input: HintPromptInput): GeminiContent[] {
  const instruction = getHintInstruction(input.hintIndex);

  const text = [
    "You are a math tutor helping a student solve a problem step by step.",
    "",
    `Problem: ${input.problemDescription}`,
    "",
    `Student's current answer: ${input.studentAnswer}`,
    "",
    `Hint ${input.hintIndex + 1}: ${instruction}`,
    "",
    "Keep your response under 100 words. Do not give the final answer.",
  ].join("\n");

  return [
    {
      role: "user",
      parts: [{ text }],
    },
  ];
}
