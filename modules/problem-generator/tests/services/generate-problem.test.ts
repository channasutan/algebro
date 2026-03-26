import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

vi.mock("@/infrastructure/math/sympy-client", () => ({
  sympyClient: {
    evaluate: vi.fn()
  }
}));

import { sympyClient } from "@/infrastructure/math/sympy-client";
import type { ProblemRepository } from "../../repositories/problem-repository";
import { generateProblem } from "../../services/generate-problem";

const context = { requestId: "test-req" };

function createRepoMock(): ProblemRepository {
  return {
    getTemplate: vi.fn(),
    listTemplates: vi.fn(),
    saveProblem: vi.fn(),
    addToPool: vi.fn(),
    getPoolCount: vi.fn()
  };
}

describe("generateProblem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns wasValidated: false when template is not found", async () => {
    const repo = createRepoMock();
    vi.mocked(repo.getTemplate).mockResolvedValue(null);

    const result = await generateProblem(
      repo,
      { templateId: "missing", difficultyLevel: 1 },
      context
    );

    expect(result).toEqual({ wasValidated: false, errorType: "template_not_found" });
    expect(repo.saveProblem).toHaveBeenCalledTimes(0);
  });

  it("returns wasValidated: false when SymPy reports unsolvable", async () => {
    const repo = createRepoMock();
    vi.mocked(repo.getTemplate).mockResolvedValue({
      id: "tpl-1",
      name: "Linear",
      templateLatex: "2x + 4 = 10",
      parameterSchema: null,
      baseDifficulty: 1,
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    vi.mocked(sympyClient.evaluate).mockResolvedValue({ result: null });

    const result = await generateProblem(
      repo,
      { templateId: "tpl-1", difficultyLevel: 2 },
      context
    );

    expect(result).toEqual({ wasValidated: false, errorType: "validation_failed" });
    expect(repo.saveProblem).toHaveBeenCalledTimes(0);
  });

  it("returns wasValidated: true and persists solutionLatex from SymPy result", async () => {
    const repo = createRepoMock();
    const mockSolutionRaw = "x = 3";

    vi.mocked(repo.getTemplate).mockResolvedValue({
      id: "tpl-1",
      name: "Linear",
      templateLatex: "2x + 4 = 10",
      parameterSchema: null,
      baseDifficulty: 1,
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    vi.mocked(sympyClient.evaluate).mockResolvedValue({ result: mockSolutionRaw });
    vi.mocked(repo.saveProblem).mockImplementation(async (problem) => ({
      ...problem,
      id: "prob-1",
      createdAt: "2026-01-01T00:00:00.000Z"
    }));

    const result = await generateProblem(
      repo,
      { templateId: "tpl-1", topicId: "topic-1", difficultyLevel: 2 },
      context
    );

    expect(result.wasValidated).toBe(true);
    expect(result.problem).toBeDefined();
    expect(result.problem?.solutionLatex).toBe(String(mockSolutionRaw));
    expect(result.problem?.problemLatex).not.toBe(result.problem?.solutionLatex);
    expect(repo.saveProblem).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.saveProblem).mock.calls[0][0].solutionLatex).toBe(String(mockSolutionRaw));
  });

  it("calls repo.saveProblem exactly once on success", async () => {
    const repo = createRepoMock();
    vi.mocked(repo.getTemplate).mockResolvedValue({
      id: "tpl-1",
      name: "Linear",
      templateLatex: "2x + 4 = 10",
      parameterSchema: null,
      baseDifficulty: 1,
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    vi.mocked(sympyClient.evaluate).mockResolvedValue({ result: "x = 3" });
    vi.mocked(repo.saveProblem).mockResolvedValue({
      id: "prob-1",
      templateId: "tpl-1",
      topicId: null,
      difficultyLevel: 2,
      problemLatex: "2x + 4 = 10",
      solutionLatex: "x = 3",
      parameters: {},
      isValidated: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    await generateProblem(repo, { templateId: "tpl-1", difficultyLevel: 2 }, context);

    expect(repo.saveProblem).toHaveBeenCalledTimes(1);
  });

  it("does not call repo.saveProblem when validation fails", async () => {
    const repo = createRepoMock();
    vi.mocked(repo.getTemplate).mockResolvedValue({
      id: "tpl-1",
      name: "Linear",
      templateLatex: "2x + 4 = 10",
      parameterSchema: null,
      baseDifficulty: 1,
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    vi.mocked(sympyClient.evaluate).mockResolvedValue({ result: null });

    await generateProblem(repo, { templateId: "tpl-1", difficultyLevel: 2 }, context);

    expect(repo.saveProblem).toHaveBeenCalledTimes(0);
  });
});
