import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureModulesBootstrappedMock,
  getCurrentSessionMock,
  getRecommendedProblemMock,
  createSupabaseCurriculumRepositoryMock,
  createSupabaseProblemRepositoryMock,
  getRequestIdMock,
} = vi.hoisted(() => ({
  ensureModulesBootstrappedMock: vi.fn(),
  getCurrentSessionMock: vi.fn(),
  getRecommendedProblemMock: vi.fn(),
  createSupabaseCurriculumRepositoryMock: vi.fn(),
  createSupabaseProblemRepositoryMock: vi.fn(),
  getRequestIdMock: vi.fn(),
}));

vi.mock("@/modules/bootstrap", () => ({
  ensureModulesBootstrapped: ensureModulesBootstrappedMock,
}));

vi.mock("@/modules/authentication", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock("@/modules/curriculum", () => ({
  getRecommendedProblem: getRecommendedProblemMock,
}));

vi.mock("@/modules/curriculum/repositories/supabase-curriculum-repository", () => ({
  createSupabaseCurriculumRepository: createSupabaseCurriculumRepositoryMock,
}));

vi.mock("@/modules/problem-generator", () => ({
  createSupabaseProblemRepository: createSupabaseProblemRepositoryMock,
}));

vi.mock("@/lib/observability", () => ({
  getRequestId: getRequestIdMock,
}));

import { GET } from "@/app/api/v1/curriculum/recommended-problem/route";

describe("GET /api/v1/curriculum/recommended-problem", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    ensureModulesBootstrappedMock.mockResolvedValue(undefined);
    getCurrentSessionMock.mockResolvedValue({
      session: {
        userId: "user-1",
        email: "user@example.com",
        isAuthenticated: true,
      },
    });
    createSupabaseCurriculumRepositoryMock.mockReturnValue({});
    createSupabaseProblemRepositoryMock.mockResolvedValue({});
    getRequestIdMock.mockResolvedValue("req-1");
    getRecommendedProblemMock.mockResolvedValue({
      problemId: "problem-1",
      topicId: "topic-1",
      difficulty: 1,
    });
  });

  it("returns 401 when there is no authenticated session", async () => {
    getCurrentSessionMock.mockResolvedValueOnce({ session: null });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(createSupabaseCurriculumRepositoryMock).not.toHaveBeenCalled();
    expect(createSupabaseProblemRepositoryMock).not.toHaveBeenCalled();
    expect(getRecommendedProblemMock).not.toHaveBeenCalled();
  });

  it("bootstraps modules before auth lookup", async () => {
    const callOrder: string[] = [];
    ensureModulesBootstrappedMock.mockImplementationOnce(async () => {
      callOrder.push("bootstrap");
    });
    getCurrentSessionMock.mockImplementationOnce(async () => {
      callOrder.push("auth");
      return { session: null };
    });

    await GET();

    expect(callOrder).toEqual(["bootstrap", "auth"]);
  });

  it("returns recommended problem for authenticated user", async () => {
    const repo = { tag: "curriculum-repo" };
    const problemRepo = { tag: "problem-repo" };
    const result = {
      problemId: "problem-99",
      topicId: "topic-linear",
      difficulty: 2,
    };

    createSupabaseCurriculumRepositoryMock.mockReturnValueOnce(repo);
    createSupabaseProblemRepositoryMock.mockResolvedValueOnce(problemRepo);
    getRecommendedProblemMock.mockResolvedValueOnce(result);

    const response = await GET();

    expect(createSupabaseCurriculumRepositoryMock).toHaveBeenCalledTimes(1);
    expect(createSupabaseProblemRepositoryMock).toHaveBeenCalledTimes(1);
    expect(getRecommendedProblemMock).toHaveBeenCalledWith(
      { userId: "user-1" },
      repo,
      problemRepo,
      { requestId: "req-1" }
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
  });
});
