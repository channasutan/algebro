import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getRecommendedProblemMock,
  createSupabaseCurriculumRepositoryMock,
  createSupabaseProblemRepositoryMock,
  generateProblemMock,
  createServiceLoggerMock
} = vi.hoisted(() => ({
  getRecommendedProblemMock: vi.fn(),
  createSupabaseCurriculumRepositoryMock: vi.fn(),
  createSupabaseProblemRepositoryMock: vi.fn(),
  generateProblemMock: vi.fn(),
  createServiceLoggerMock: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

vi.mock("@/modules/curriculum", () => ({
  getRecommendedProblem: getRecommendedProblemMock
}));

vi.mock("@/modules/curriculum/repositories/supabase-curriculum-repository", () => ({
  createSupabaseCurriculumRepository: createSupabaseCurriculumRepositoryMock
}));

vi.mock("@/modules/problem-generator", () => ({
  createSupabaseProblemRepository: createSupabaseProblemRepositoryMock,
  generateProblem: generateProblemMock
}));

vi.mock("@/lib/observability", () => ({
  createServiceLogger: createServiceLoggerMock
}));

import { getNextProblem } from "../../services/get-next-problem";

describe("getNextProblem", () => {
  const context = { requestId: "req-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseCurriculumRepositoryMock.mockReturnValue({});
    createSupabaseProblemRepositoryMock.mockResolvedValue({
      listTemplates: vi.fn().mockResolvedValue([])
    });
  });

  it("returns curriculum recommendation when available", async () => {
    getRecommendedProblemMock.mockResolvedValueOnce({
      problemId: "problem-1",
      topicId: "topic-1",
      difficulty: 1
    });

    const result = await getNextProblem(
      { userId: "user-1", topicId: "topic-1" },
      context
    );

    expect(result).toEqual({ problemId: "problem-1", topicId: "topic-1" });
    expect(getRecommendedProblemMock).toHaveBeenCalledTimes(1);
    expect(generateProblemMock).not.toHaveBeenCalled();
  });

  it("falls back to random template generation when curriculum fails", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const listTemplates = vi.fn().mockResolvedValue([
      { id: "tpl-1", name: "template-a" },
      { id: "tpl-2", name: "template-b" }
    ]);

    createSupabaseProblemRepositoryMock.mockResolvedValueOnce({
      listTemplates
    });

    getRecommendedProblemMock.mockRejectedValueOnce(new Error("curriculum error"));
    generateProblemMock.mockResolvedValueOnce({
      wasValidated: true,
      problem: {
        id: "problem-fallback",
        topicId: "topic-fallback"
      }
    });

    const result = await getNextProblem(
      { userId: "user-1", topicId: "topic-1" },
      context
    );

    expect(result).toEqual({
      problemId: "problem-fallback",
      topicId: "topic-fallback"
    });
    expect(listTemplates).toHaveBeenCalledTimes(1);
    expect(generateProblemMock).toHaveBeenCalledWith(
      expect.objectContaining({ listTemplates }),
      {
        templateId: "template-a",
        topicId: "topic-1",
        difficultyLevel: 1
      },
      context
    );

    randomSpy.mockRestore();
  });

  it("throws when fallback has no templates", async () => {
    getRecommendedProblemMock.mockRejectedValueOnce(new Error("curriculum error"));

    await expect(
      getNextProblem({ userId: "user-1", topicId: null }, context)
    ).rejects.toThrow("no templates available for fallback generation");

    expect(generateProblemMock).not.toHaveBeenCalled();
  });
});
