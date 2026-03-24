import { describe, it, expect, vi, beforeEach } from "vitest";
import { populatePool } from "../../services/populate-problem-pool";
import type { ProblemRepository } from "../../repositories/problem-repository";
import type { GeneratedProblem } from "../../domain";

// Mock generateProblem
vi.mock("./generate-problem", () => ({
  generateProblem: vi.fn(),
}));

// Mock observability
vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { generateProblem } from "../../services/generate-problem";

const context = { requestId: "test-req" };

describe("populatePool", () => {
  const mockRepo: ProblemRepository = {
    getTemplate: vi.fn(),
    listTemplates: vi.fn(),
    saveProblem: vi.fn(),
    addToPool: vi.fn(),
    getPoolCount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates all requested problems successfully", async () => {
    const mockGenerate = vi.mocked(generateProblem);

    for (let i = 0; i < 5; i++) {
      mockGenerate.mockResolvedValueOnce({
        wasValidated: true,
        problem: {
          id: `problem-${i}`,
          templateId: "template-1",
          topicId: "topic-1",
          difficultyLevel: 3,
          problemLatex: "2x = 4",
          solutionLatex: "x = 2",
          parameters: {},
          isValidated: true,
          createdAt: "2024-01-01T00:00:00Z",
        } as GeneratedProblem,
      });
    }

    vi.mocked(mockRepo.addToPool).mockResolvedValue({
      id: "pool-entry",
      problemId: "problem-id",
      topicId: "topic-1",
      createdAt: "2024-01-01T00:00:00Z",
    });

    const result = await populatePool(
      mockRepo,
      {
        templateId: "template-1",
        topicId: "topic-1",
        difficulty: 3,
        count: 5,
      },
      context
    );

    expect(result.generated).toBe(5);
    expect(result.failed).toBe(0);
    expect(mockRepo.addToPool).toHaveBeenCalledTimes(5);
  });

  it("handles validation failures and continues batch", async () => {
    const mockGenerate = vi.mocked(generateProblem);

    // 2 successes, 1 failure, 2 successes
    mockGenerate.mockResolvedValueOnce({ wasValidated: true, problem: { id: "p1" } as GeneratedProblem });
    mockGenerate.mockResolvedValueOnce({ wasValidated: true, problem: { id: "p2" } as GeneratedProblem });
    mockGenerate.mockResolvedValueOnce({ wasValidated: false, errorType: "validation_failed" });
    mockGenerate.mockResolvedValueOnce({ wasValidated: true, problem: { id: "p3" } as GeneratedProblem });
    mockGenerate.mockResolvedValueOnce({ wasValidated: true, problem: { id: "p4" } as GeneratedProblem });

    vi.mocked(mockRepo.addToPool).mockResolvedValue({
      id: "pool-entry",
      problemId: "problem-id",
      topicId: "topic-1",
      createdAt: "2024-01-01T00:00:00Z",
    });

    const result = await populatePool(
      mockRepo,
      {
        templateId: "template-1",
        topicId: "topic-1",
        difficulty: 3,
        count: 5,
      },
      context
    );

    expect(result.generated).toBe(4);
    expect(result.failed).toBe(1);
  });

  it("handles repository errors and continues batch", async () => {
    const mockGenerate = vi.mocked(generateProblem);

    mockGenerate.mockResolvedValue({
      wasValidated: true,
      problem: { id: "problem-1" } as GeneratedProblem,
    });

    // First add succeeds, second throws, third succeeds
    vi.mocked(mockRepo.addToPool)
      .mockResolvedValueOnce({ id: "pool-1", problemId: "p1", topicId: "topic-1", createdAt: "" })
      .mockRejectedValueOnce(new Error("Database error"))
      .mockResolvedValueOnce({ id: "pool-3", problemId: "p3", topicId: "topic-1", createdAt: "" });

    const result = await populatePool(
      mockRepo,
      {
        templateId: "template-1",
        topicId: "topic-1",
        difficulty: 3,
        count: 3,
      },
      context
    );

    expect(result.generated).toBe(2);
    expect(result.failed).toBe(1);
  });

  it("returns zero counts when count is zero", async () => {
    const result = await populatePool(
      mockRepo,
      {
        templateId: "template-1",
        topicId: "topic-1",
        difficulty: 3,
        count: 0,
      },
      context
    );

    expect(result.generated).toBe(0);
    expect(result.failed).toBe(0);
  });
});
