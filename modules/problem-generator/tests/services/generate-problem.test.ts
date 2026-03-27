import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProblemTemplate } from "../../domain/problem-template";
import type { ProblemRepository } from "../../repositories/problem-repository";
import { generateProblem } from "../../services/generate-problem";

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

vi.mock("../../services/validate-solvability", () => ({
  validateSolvability: vi.fn()
}));

import { validateSolvability } from "../../services/validate-solvability";

const TEMPLATE_FIXTURE: ProblemTemplate = {
  id: "tpl-1",
  name: "Linear",
  templateLatex: "2x + 4 = 10",
  parameterSchema: null,
  baseDifficulty: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockSaveProblemSuccess(repo: ProblemRepository): void {
  vi.mocked(repo.saveProblem).mockImplementation(async (problem) => ({
    ...problem,
    id: "prob-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
}

function mockValidationFailure(): void {
  vi.mocked(validateSolvability).mockResolvedValue({
    isSolvable: false,
    errorType: "sympy_unavailable",
  });
}

function mockValidationSuccess(solutionRaw: unknown = "x = 3"): void {
  vi.mocked(validateSolvability).mockResolvedValue({
    isSolvable: true,
    solutionRaw,
  });
}

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
    vi.mocked(repo.getTemplate).mockResolvedValue(TEMPLATE_FIXTURE);
    mockValidationFailure();

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

    vi.mocked(repo.getTemplate).mockResolvedValue(TEMPLATE_FIXTURE);
    mockValidationSuccess(mockSolutionRaw);
    mockSaveProblemSuccess(repo);

    const result = await generateProblem(
      repo,
      { templateId: "tpl-1", topicId: "topic-1", difficultyLevel: 2 },
      context
    );

    expect(result.wasValidated).toBe(true);
    expect(result.problem).toBeDefined();
    expect(result.problem?.solutionLatex).toBe("x = 3");
    expect(result.problem?.problemLatex).not.toBe(result.problem?.solutionLatex);
    expect(repo.saveProblem).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.saveProblem).mock.calls[0][0].solutionLatex).toBe("x = 3");
  });

  it("calls repo.saveProblem exactly once on success", async () => {
    const repo = createRepoMock();
    vi.mocked(repo.getTemplate).mockResolvedValue(TEMPLATE_FIXTURE);
    mockValidationSuccess();
    mockSaveProblemSuccess(repo);

    await generateProblem(repo, { templateId: "tpl-1", difficultyLevel: 2 }, context);

    expect(repo.saveProblem).toHaveBeenCalledTimes(1);
  });

  it("does not call repo.saveProblem when validation fails", async () => {
    const repo = createRepoMock();
    vi.mocked(repo.getTemplate).mockResolvedValue(TEMPLATE_FIXTURE);
    mockValidationFailure();

    await generateProblem(repo, { templateId: "tpl-1", difficultyLevel: 2 }, context);

    expect(repo.saveProblem).toHaveBeenCalledTimes(0);
  });

  it("serializes solutionLatex correctly when SymPy returns an object", async () => {
    const repo = createRepoMock();
    const mockSolutionRaw = { x: 3 };

    vi.mocked(repo.getTemplate).mockResolvedValue(TEMPLATE_FIXTURE);
    mockValidationSuccess(mockSolutionRaw);
    mockSaveProblemSuccess(repo);

    const result = await generateProblem(
      repo,
      { templateId: "tpl-1", topicId: "topic-1", difficultyLevel: 2 },
      context
    );

    expect(result.wasValidated).toBe(true);
    expect(result.problem).toBeDefined();
    expect(result.problem?.solutionLatex).toBe(JSON.stringify(mockSolutionRaw));
    expect(result.problem?.solutionLatex).not.toBe("[object Object]");
    expect(repo.saveProblem).toHaveBeenCalledTimes(1);
  });

  it("serializes solutionLatex correctly when SymPy returns an array", async () => {
    const repo = createRepoMock();
    const mockSolutionRaw = [3];

    vi.mocked(repo.getTemplate).mockResolvedValue(TEMPLATE_FIXTURE);
    mockValidationSuccess(mockSolutionRaw);
    mockSaveProblemSuccess(repo);

    const result = await generateProblem(
      repo,
      { templateId: "tpl-1", topicId: "topic-1", difficultyLevel: 2 },
      context
    );

    expect(result.wasValidated).toBe(true);
    expect(result.problem).toBeDefined();
    expect(result.problem?.solutionLatex).toBe(JSON.stringify(mockSolutionRaw));
    expect(repo.saveProblem).toHaveBeenCalledTimes(1);
  });
});