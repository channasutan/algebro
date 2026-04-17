import {
  startSession,
  createAttempt,
  submitStep,
  getNextProblem,
  type StartPracticeResult,
  type SubmitStepResult,
} from "@/modules/practice"

export type { StartPracticeResult, SubmitStepResult }

export async function startPracticeFlow(
  userId: string,
  topicId: string | null,
  context: { requestId: string }
): Promise<StartPracticeResult & { attemptId: string; problemId: string }> {
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
): Promise<SubmitStepResult> {
  const step = await submitStep({ attemptId, userId, stepLatex }, context)
  return {
    stepId: step.id,
    stepIndex: step.stepIndex,
    stepLatex: step.stepLatex,
    isValid: step.isValid === true,
  }
}
