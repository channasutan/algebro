import { getFreeHintLimit } from "@/config/env.server-entry";

export const FREE_HINT_LIMIT: number = getFreeHintLimit();

export function isQuotaExceeded(hintCount: number, planTier: string): boolean {
  if (planTier === "premium") return false;
  return hintCount >= FREE_HINT_LIMIT;
}
