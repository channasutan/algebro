import { startSession, createAttempt, submitStep, completeAttempt } from "@/modules/practice";
export { DuplicateActiveSessionError } from "@/modules/practice";

export async function startPracticeSession(input: { userId: string; topicId?: string | null }): Promise<ReturnType<typeof startSession>> {
  return startSession(
    { userId: input.userId, topicId: input.topicId ?? null },
    { requestId: crypto.randomUUID() }
  );
}

export async function createNewAttempt(input: { sessionId: string; problemId: string; userId: string }): Promise<ReturnType<typeof createAttempt>> {
  return createAttempt(input, { requestId: crypto.randomUUID() });
}

export async function submitStepToAttempt(input: { attemptId: string; userId: string; stepLatex: string }): Promise<ReturnType<typeof submitStep>> {
  return submitStep(input, { requestId: crypto.randomUUID() });
}

export async function completePracticeAttempt(input: { attemptId: string; userId: string; isCorrect: boolean; topicId?: string | null }): Promise<ReturnType<typeof completeAttempt>> {
  return completeAttempt(input, { requestId: crypto.randomUUID() });
}
