"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { startPracticeSession, createNewAttempt, submitStepToAttempt } from "@/lib/services/practice-service";
import { getNextProblem } from "@/modules/practice";
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
  const practiceSession = await startPracticeSession({ userId, topicId });

  // Resolve next problem via curriculum-first strategy
  const nextProblem = await getNextProblem({ userId, topicId }, context);
  const problemId = nextProblem.problemId;

  // Create attempt without initial step — first step will be added via submitStep
  const attemptResult = await createNewAttempt({
    sessionId: practiceSession.id,
    problemId,
    userId
    // stepIndex and stepLatex omitted — attempt-only creation
  });

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

  const step = await submitStepToAttempt({ attemptId, userId, stepLatex });

  return {
    stepId: step.id,
    stepIndex: step.stepIndex,
    stepLatex: step.stepLatex,
    isValid: step.isValid === true
  };
}
