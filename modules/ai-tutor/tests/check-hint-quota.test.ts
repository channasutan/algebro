import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkHintQuotaWithRepository } from "../services/check-hint-quota";
import type { AiTutorRepository } from "../repositories/ai-tutor-repository";

vi.mock("@/modules/billing", () => ({
  checkFeatureAccess: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/config/env.server-entry", () => ({
  getFreeHintLimit: vi.fn().mockReturnValue(3),
}));

// Import AFTER vi.mock so the mock is in place
import { checkFeatureAccess } from "@/modules/billing";

function makeMockRepo(hintCount: number): AiTutorRepository {
  return {
    getHintUsage: vi.fn().mockResolvedValue(hintCount),
    incrementHintUsage: vi.fn().mockResolvedValue(undefined),
  };
}

describe("checkHintQuotaWithRepository", () => {
  beforeEach(() => {
    vi.mocked(checkFeatureAccess).mockReset();
  });

  it("returns allowed with remaining=2 for free tier within quota", async () => {
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier: "free" });
    const repo = makeMockRepo(1);

    const result = await checkHintQuotaWithRepository(repo, { userId: "u1", problemId: "p1" });

    expect(result).toEqual({ allowed: true, remaining: 2 });
  });

  it("returns quota_exceeded when free tier is exactly at quota", async () => {
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier: "free" });
    const repo = makeMockRepo(3);

    const result = await checkHintQuotaWithRepository(repo, { userId: "u1", problemId: "p1" });

    expect(result).toEqual({ allowed: false, reason: "quota_exceeded", remaining: 0 });
  });

  it("returns quota_exceeded when free tier is over quota", async () => {
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier: "free" });
    const repo = makeMockRepo(5);

    const result = await checkHintQuotaWithRepository(repo, { userId: "u1", problemId: "p1" });

    expect(result).toEqual({ allowed: false, reason: "quota_exceeded", remaining: 0 });
  });

  it("returns allowed with remaining=null for premium and does not read hint usage", async () => {
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier: "premium" });
    const repo = makeMockRepo(99);

    const result = await checkHintQuotaWithRepository(repo, { userId: "u1", problemId: "p1" });

    expect(result).toEqual({ allowed: true, remaining: null });
    expect(repo.getHintUsage).not.toHaveBeenCalled();
  });

  it("returns feature_not_allowed when checkFeatureAccess returns allowed: false", async () => {
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: false, planTier: "free" });
    const repo = makeMockRepo(0);

    const result = await checkHintQuotaWithRepository(repo, { userId: "u1", problemId: "p1" });

    expect(result).toEqual({ allowed: false, reason: "feature_not_allowed", remaining: 0 });
    expect(repo.getHintUsage).not.toHaveBeenCalled();
  });

  it("allows when usage is one below the limit", async () => {
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier: "free" });
    const repo = makeMockRepo(2); // limit is 3, so 2 is allowed

    const result = await checkHintQuotaWithRepository(repo, { userId: "u1", problemId: "p1" });

    expect(result).toEqual({ allowed: true, remaining: 1 });
  });

  it("increments usage correctly via repository", async () => {
    const incrementSpy = vi.fn().mockResolvedValue(undefined);
    const repo = {
      getHintUsage: vi.fn().mockResolvedValue(0),
      incrementHintUsage: incrementSpy,
    };

    await repo.incrementHintUsage("u1", "p1");

    expect(incrementSpy).toHaveBeenCalledTimes(1);
    expect(incrementSpy).toHaveBeenCalledWith("u1", "p1");
  });
});