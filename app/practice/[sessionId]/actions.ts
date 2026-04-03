'use server';
import 'server-only';

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { getCurrentSession } from "@/modules/authentication";
import { getRequestId } from "@/lib/observability";
import { generateHint } from "@/modules/ai-tutor";
import type { HintActionResult } from "@/modules/ai-tutor/contracts";
import { getInfrastructureServerEnv } from "@/config/env.server";

export async function generateHintAction(
  attemptId: string,
  stepIndex: number,
  _prev: HintActionResult | null,
  _formData: FormData
): Promise<HintActionResult> {
  // Stubbed inputs intentionally guarded above (ALE-127). Wire to real
  // problem data when practice module exposes getAttempt API. // NOSONAR
  const isStubbedGenerateHintInput = true;
  const { NODE_ENV } = getInfrastructureServerEnv();
  if (NODE_ENV === 'production' && isStubbedGenerateHintInput) {
    console.error(
      '[generateHintAction] Stubbed inputs detected in production — returning ai_unavailable'
    );
    return { status: 'ai_unavailable' };
  }

  await ensureModulesBootstrapped()

  const sessionResult = await getCurrentSession()
  if (!sessionResult.session?.isAuthenticated) {
    return { status: 'validation_error' }
  }

  const userId = sessionResult.session.userId
  const requestId = await getRequestId()

  try {
    const result = await generateHint({
      userId,
      problemId: attemptId,
      problemLatex: attemptId,
      studentStepLatex: String(stepIndex),
      errorType: null,
      previousStepsLatex: [],
      hintCount: stepIndex,
      requestId
    })

    if (result.success) {
      return { status: 'hint', hint: result.hint }
    }

    if (result.reason === 'quota_exceeded') {
      return { status: 'quota_exceeded', remaining: 0 }
    }

    if (result.reason === 'validation_error') {
      return { status: 'validation_error' }
    }

    return { status: 'ai_unavailable' }
  } catch {
    return { status: 'ai_unavailable' }
  }
}
