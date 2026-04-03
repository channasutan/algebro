export const billingModule = {
  name: "billing"
} as const;

export type PlanTier = "free" | "premium";

export type FeatureAccessResult = {
  allowed: boolean;
  planTier: PlanTier;
};

/**
 * Stub implementation — always returns free-tier allowed.
 * Phase 8 unit tests mock this via vi.mock("@/modules/billing").
 * Replace with real subscription lookup in a future billing phase.
 */
export async function checkFeatureAccess(
  _userId: string,
  _feature: string
): Promise<FeatureAccessResult> {
  return { allowed: true, planTier: "free" };
}
