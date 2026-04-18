import * as Practice from "@/modules/practice"
import {
  startSession,
  createAttempt,
  submitStep,
  completeAttempt,
  getNextProblem,
} from "@/modules/practice"

export { DuplicateActiveSessionError, type StartPracticeResult, type SubmitStepResult } from "@/modules/practice"

// --- New Practice Flow Methods (for app/(app)/practice/actions.ts) ---

export async function startPracticeFlow(
  userId: string,
  topicId: string | null,
  context: { requestId: string }
): Promise<Practice.StartPracticeResult & { attemptId: string; problemId: string }> {
  const practiceSession = await startSession({ userId, topicId }, context)
  const nextProblem = await getNextProblem({ userId, topicId }, context)
  const problemId = nextProblem.problemId
  const attemptResult = await createAttempt(
    { sessionId: practiceSession.id, problemId, userId },
    context
  )
  return {
    sessionId: practiceSession.id,
    attemptId: attemptResult.attempt.id,
    problemId,
  }
}

export async function submitPracticeStep(
  attemptId: string,
  userId: string,
  stepLatex: string,
  context: { requestId: string }
): Promise<Practice.SubmitStepResult> {
  const step = await submitStep({ attemptId, userId, stepLatex }, context)
  return {
    stepId: step.id,
    stepIndex: step.stepIndex,
    stepLatex: step.stepLatex,
    isValid: step.isValid === true,
  }
}

// --- Legacy Service Methods (for app/api/v1/...) ---

export async function startPracticeSession(input: {
  userId: string
  topicId?: string | null
}): Promise<ReturnType<typeof startSession>> {
  return startSession(
    { userId: input.userId, topicId: input.topicId ?? null },
    { requestId: crypto.randomUUID() }
  )
}

export async function createNewAttempt(input: {
  sessionId: string
  problemId: string
  userId: string
}): Promise<ReturnType<typeof createAttempt>> {
  return createAttempt(input, { requestId: crypto.randomUUID() })
}

export async function submitStepToAttempt(input: {
  attemptId: string
  userId: string
  stepLatex: string
}): Promise<ReturnType<typeof submitStep>> {
  return submitStep(input, { requestId: crypto.randomUUID() })
}

export async function completePracticeAttempt(input: {
  attemptId: string
  userId: string
  isCorrect: boolean
  topicId?: string | null
}): Promise<ReturnType<typeof completeAttempt>> {
  return completeAttempt(input, { requestId: crypto.randomUUID() })
}
