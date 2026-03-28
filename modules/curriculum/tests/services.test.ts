import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateMastery } from "../services/update-mastery";
import { getRecommendedProblem } from "../services/get-recommended-problem";
import { calculateMasteryScore } from "../services/calculate-mastery-score";
import type { CurriculumRepository, TopicProgress } from "../repositories/curriculum-repository";
import type { ProblemRepository } from "@/modules/problem-generator/repositories/problem-repository";
import type { AttemptHistory } from "../domain/mastery";

// ── Mock generateProblem ────────────────────────────────────────────────────
vi.mock("@/modules/problem-generator", () => ({
  generateProblem: vi.fn(),
}));
import { generateProblem } from "@/modules/problem-generator";
const mockGenerateProblem = vi.mocked(generateProblem);

// ── Mock builders ───────────────────────────────────────────────────────────
function makeMockRepo(overrides?: Partial<CurriculumRepository>): CurriculumRepository {
  return {
    getTopicProgress: vi.fn().mockResolvedValue(null),
    upsertTopicProgress: vi.fn().mockResolvedValue(undefined),
    getTopicProgressByUser: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeMockProblemRepo(overrides?: Partial<ProblemRepository>): ProblemRepository {
  return {
    getTemplate: vi.fn().mockResolvedValue(null),
    listTemplates: vi.fn().mockResolvedValue([]),
    saveProblem: vi.fn().mockResolvedValue({ id: "prob-1" }),
    addToPool: vi.fn().mockResolvedValue({ id: "pool-entry-1" }),
    getPoolCount: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeTopicProgress(overrides?: Partial<TopicProgress>): TopicProgress {
  return {
    id: "tp-1",
    userId: "user-1",
    topicId: "topic-algebra",
    masteryScore: 0.5,
    lastPracticedAt: null,
    ...overrides,
  };
}

const mockContext = { requestId: "test-req-1" };

// Helper to reduce duplication in tests with existing score
function makeRepoWithExistingScore(masteryScore: number): CurriculumRepository {
  return makeMockRepo({
    getTopicProgress: vi.fn().mockResolvedValue(makeTopicProgress({ masteryScore })),
  });
}

// ── updateMastery ───────────────────────────────────────────────────────────
describe("updateMastery", () => {
  it("user dengan 0 history → previousScore = 0", async () => {
    const repo = makeMockRepo(); // getTopicProgress returns null
    const result = await updateMastery(
      { userId: "u1", topicId: "t1", attemptResult: "correct", attemptId: "a1", completedAt: new Date() },
      repo
    );
    expect(result.previousScore).toBe(0);
  });

  it("user dengan existing score → previousScore = existing masteryScore", async () => {
    const repo = makeRepoWithExistingScore(0.6);
    const result = await updateMastery(
      { userId: "u1", topicId: "t1", attemptResult: "correct", attemptId: "a1", completedAt: new Date() },
      repo
    );
    expect(result.previousScore).toBe(0.6);
  });

  it("attempt 'correct' → masteryScore > 0 (score computed)", async () => {
    const repo = makeMockRepo();
    const result = await updateMastery(
      { userId: "u1", topicId: "t1", attemptResult: "correct", attemptId: "a1", completedAt: new Date() },
      repo
    );
    expect(result.masteryScore).toBeGreaterThan(0);
  });

  it("attempt 'incorrect' → masteryScore <= previousScore when existing score present", async () => {
    const repo = makeRepoWithExistingScore(0.8);
    const result = await updateMastery(
      { userId: "u1", topicId: "t1", attemptResult: "incorrect", attemptId: "a1", completedAt: new Date() },
      repo
    );
    expect(result.masteryScore).toBeLessThanOrEqual(result.previousScore);
  });

  it("calls repo.upsertTopicProgress with calculated masteryScore", async () => {
    const repo = makeMockRepo();
    const result = await updateMastery(
      { userId: "u1", topicId: "t1", attemptResult: "correct", attemptId: "a1", completedAt: new Date() },
      repo
    );
    expect(repo.upsertTopicProgress).toHaveBeenCalledWith("u1", "t1", result.masteryScore);
  });
});

// ── getRecommendedProblem ───────────────────────────────────────────────────
describe("getRecommendedProblem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("user tanpa history → generateProblem dipanggil dengan difficultyLevel: 1", async () => {
    const repo = makeMockRepo(); // getTopicProgressByUser returns []
    const problemRepo = makeMockProblemRepo();
    mockGenerateProblem.mockResolvedValueOnce({
      wasValidated: true,
      problem: { id: "p1", topicId: "t1", difficultyLevel: 1, templateId: null, problemLatex: "", solutionLatex: "", parameters: null, isValidated: true, createdAt: "" },
    });

    await getRecommendedProblem({ userId: "u1" }, repo, problemRepo, mockContext);

    expect(mockGenerateProblem).toHaveBeenCalledWith(
      problemRepo,
      expect.objectContaining({ difficultyLevel: 1 }),
      mockContext
    );
  });

  it("user dengan progress → topik index [0] (mastery terendah) dipilih sebagai topicId", async () => {
    const progress = [
      makeTopicProgress({ topicId: "topic-lowest", masteryScore: 0.1 }),
      makeTopicProgress({ topicId: "topic-higher", masteryScore: 0.8 }),
    ];
    const repo = makeMockRepo({
      getTopicProgressByUser: vi.fn().mockResolvedValue(progress),
    });
    const problemRepo = makeMockProblemRepo();
    mockGenerateProblem.mockResolvedValueOnce({
      wasValidated: true,
      problem: { id: "p1", topicId: "topic-lowest", difficultyLevel: 1, templateId: null, problemLatex: "", solutionLatex: "", parameters: null, isValidated: true, createdAt: "" },
    });

    await getRecommendedProblem({ userId: "u1" }, repo, problemRepo, mockContext);

    expect(mockGenerateProblem).toHaveBeenCalledWith(
      problemRepo,
      expect.objectContaining({ topicId: "topic-lowest" }),
      mockContext
    );
  });

  it("generateProblem failure (wasValidated=false) → error di-throw, tidak di-swallow", async () => {
    const repo = makeMockRepo();
    const problemRepo = makeMockProblemRepo();
    mockGenerateProblem.mockResolvedValueOnce({
      wasValidated: false,
      errorType: "template_not_found",
    });

    await expect(
      getRecommendedProblem({ userId: "u1" }, repo, problemRepo, mockContext)
    ).rejects.toThrow("template_not_found");
  });

  it("returns { problemId, topicId, difficulty } dari result.problem fields", async () => {
    const repo = makeMockRepo();
    const problemRepo = makeMockProblemRepo();
    mockGenerateProblem.mockResolvedValueOnce({
      wasValidated: true,
      problem: {
        id: "prob-xyz",
        topicId: "topic-123",
        difficultyLevel: 2,
        templateId: null,
        problemLatex: "",
        solutionLatex: "",
        parameters: null,
        isValidated: true,
        createdAt: "",
      },
    });

    const result = await getRecommendedProblem({ userId: "u1" }, repo, problemRepo, mockContext);

    expect(result).toEqual({
      problemId: "prob-xyz",
      topicId: "topic-123",
      difficulty: 2,
    });
  });
});

// ── calculateMasteryScore service ───────────────────────────────────────────
describe("calculateMasteryScore service", () => {
  it("empty history → 0", () => {
    expect(calculateMasteryScore([])).toBe(0);
  });

  it("single correct attempt (recent) → score > 0", () => {
    const history: AttemptHistory[] = [
      { attemptId: "a1", result: "correct", completedAt: new Date() },
    ];
    expect(calculateMasteryScore(history)).toBeGreaterThan(0);
  });

  it("result identik dengan domain calculateMasteryScore langsung", async () => {
    const { calculateMasteryScore: domainFn } = await import("../domain/mastery");
    const history: AttemptHistory[] = [
      { attemptId: "a1", result: "correct", completedAt: new Date() },
      { attemptId: "a2", result: "incorrect", completedAt: new Date(Date.now() - 5000) },
    ];
    expect(calculateMasteryScore(history)).toBe(domainFn(history));
  });
});
