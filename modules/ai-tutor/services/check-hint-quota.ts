import "server-only";

import { getFreeHintLimit } from "@/config/env.server-entry";
import { checkFeatureAccess } from "@/modules/billing";

import type { CheckQuotaInput, CheckQuotaResult } from "../contracts/check-quota";
import { isQuotaExceeded } from "../domain/quota-policy";
import type { AiTutorRepository } from "../repositories/ai-tutor-repository";
import { createSupabaseAiTutorRepository } from "../repositories/supabase-ai-tutor-repository";

export async function checkHintQuota(
  input: CheckQuotaInput
): Promise<CheckQuotaResult> {
  const repo = createSupabaseAiTutorRepository();
  return checkHintQuotaWithRepository(repo, input);
}

export async function checkHintQuotaWithRepository(
  repo: AiTutorRepository,
  input: CheckQuotaInput
): Promise<CheckQuotaResult> {
  const access = await checkFeatureAccess(input.userId, "ai_hints");

  // Billing gate takes priority — if feature not allowed, skip quota checks entirely
  if (!access.allowed) {
    return { allowed: false, reason: "feature_not_allowed", remaining: 0 };
  }

  if (access.planTier === "premium") {
    return { allowed: true, remaining: null };
  }

  const hintCount = await repo.getHintUsage(input.userId, input.problemId);
  const limit = getFreeHintLimit();

  if (isQuotaExceeded(hintCount, access.planTier)) {
    return { allowed: false, reason: "quota_exceeded", remaining: 0 };
  }

  return { allowed: true, remaining: limit - hintCount };
}