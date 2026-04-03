'use server';
import 'server-only';

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { getCurrentSession } from "@/modules/authentication";
import { getRequestId } from "@/lib/observability";
import { generateHint } from "@/modules/ai-tutor";
import type { HintActionResult } from "@/modules/ai-tutor/contracts";

export async function generateHintAction(
  attemptId: string,
  stepIndex: number,
  _prev: HintActionResult | null,
  _formData: FormData
): Promise<HintActionResult> {
  // TODO (ALE-127): Replace stubbed inputs with real practice session data
  // - problemId: actual problem ID from attempt
  // - problemLatex: actual problem LaTeX
  // - studentStepLatex: student's submitted step LaTeX
  // - previousStepsLatex: array of prior correct steps
  // - hintCount: actual hint usage count for (userId, problemId)
  const isStubbedGenerateHintInput = true
  if (process.env.NODE_ENV === 'production' && isStubbedGenerateHintInput) {
    console.error(
      '[generateHintAction] Stubbed inputs detected in production — returning ai_unavailable'
    )
    return { status: 'ai_unavailable' }
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
