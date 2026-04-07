"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { startSession, createAttempt, submitStep, getNextProblem } from "@/modules/practice";
import { getCurrentSession } from "@/modules/authentication";
import { createServiceLogger, getRequestId } from "@/lib/observability";
import type { StartPracticeResult, SubmitStepResult } from "@/modules/practice/contracts/practice";

export async function startPracticeFlowAction(topicId: string | null): Promise<StartPracticeResult> {
  await ensureModulesBootstrapped();

  const sessionResult = await getCurrentSession();
  if (!sessionResult.session?.isAuthenticated) {
    throw new Error("Authentication required");
  }

  const userId = sessionResult.session.userId;
  const requestId = await getRequestId();
  const context = { requestId };
  const log = createServiceLogger(requestId);

  log.info({ event: "practice.flow", meta: { type: "domain", phase: "start", userId, topicId } });

  // Create session
  const practiceSession = await startSession({ userId, topicId }, context);

  // Resolve next problem via curriculum-first strategy
  const nextProblem = await getNextProblem({ userId, topicId }, context);
  const problemId = nextProblem.problemId;

  // Create attempt with initial step atomically (not exposed to UI)
  const attemptResult = await createAttempt({
    sessionId: practiceSession.id,
    problemId,
    userId,
    stepIndex: 0,
    stepLatex: "" // Initial empty step, user will submit actual steps via submitStep
  }, context);

  log.info({ event: "practice.flow", meta: { type: "domain", phase: "complete", userId, sessionId: practiceSession.id, attemptId: attemptResult.attempt.id } });

  return {
    sessionId: practiceSession.id,
    attemptId: attemptResult.attempt.id,
    problemId
  };
}

export async function submitPracticeStepAction(
  attemptId: string,
  stepLatex: string
): Promise<SubmitStepResult> {
  await ensureModulesBootstrapped();

  const sessionResult = await getCurrentSession();
  if (!sessionResult.session?.isAuthenticated) {
    throw new Error("Authentication required");
  }

  const userId = sessionResult.session.userId;
  const requestId = await getRequestId();
  const context = { requestId };
  const log = createServiceLogger(requestId);

  log.info({ event: "practice.step", meta: { type: "domain", phase: "start", userId, attemptId } });

  const step = await submitStep({ attemptId, userId, stepLatex }, context);

  return {
    stepId: step.id,
    stepIndex: step.stepIndex,
    stepLatex: step.stepLatex,
    isValid: step.isValid === true
  };
}
