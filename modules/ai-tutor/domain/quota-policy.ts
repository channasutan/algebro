export type PlanTier = "free" | "premium";

export function isQuotaExceeded(
  hintCount: number,
  planTier: PlanTier,
  freeHintLimit: number
): boolean {
  if (planTier === "premium") return false;
  return hintCount >= freeHintLimit;
}
