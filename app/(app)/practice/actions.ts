"use server"

import { startPracticeFlow, submitPracticeStep, type StartPracticeResult, type SubmitStepResult } from "@/services/practice-service"
import { getCurrentSession } from "@/services/auth-service"
import { createServiceLogger, getRequestId } from "@/lib/observability"

export async function startPracticeFlowAction(topicId: string | null): Promise<StartPracticeResult & { attemptId: string; problemId: string }> {
  const sessionResult = await getCurrentSession()
  if (!sessionResult.session?.isAuthenticated) {
    throw new Error("Authentication required")
  }

  const userId = sessionResult.session.userId
  const requestId = await getRequestId()
  const context = { requestId }
  const log = createServiceLogger(requestId)

  log.info({ event: "practice.flow", meta: { type: "domain", phase: "start", userId, topicId } })

  const result = await startPracticeFlow(userId, topicId, context)

  log.info({ event: "practice.flow", meta: { type: "domain", phase: "complete", userId, sessionId: result.sessionId, attemptId: result.attemptId } })

  return result
}

export async function submitPracticeStepAction(
  attemptId: string,
  stepLatex: string
): Promise<SubmitStepResult> {
  const sessionResult = await getCurrentSession()
  if (!sessionResult.session?.isAuthenticated) {
    throw new Error("Authentication required")
  }

  const userId = sessionResult.session.userId
  const requestId = await getRequestId()
  const context = { requestId }
  const log = createServiceLogger(requestId)

  log.info({ event: "practice.step", meta: { type: "domain", phase: "start", userId, attemptId } })

  return submitPracticeStep(attemptId, userId, stepLatex, context)
}
