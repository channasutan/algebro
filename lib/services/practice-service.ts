import { startSession } from "@/modules/practice/services/start-session";
import { createAttempt } from "@/modules/practice/services/create-attempt";
import { submitStep } from "@/modules/practice/services/submit-step";
import { completeAttempt } from "@/modules/practice/services/complete-attempt";
import { DuplicateActiveSessionError } from "@/modules/practice/errors";

export { DuplicateActiveSessionError };

export async function startPracticeSession(input: { userId: string; topicId?: string | null }): Promise<ReturnType<typeof startSession>> {
  return startSession(input, { requestId: crypto.randomUUID() });
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

