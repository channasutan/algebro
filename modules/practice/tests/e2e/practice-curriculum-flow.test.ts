import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { eventBus } from "@/modules/practice";
import { type CurriculumRepository } from "@/modules/curriculum/repositories/curriculum-repository";
import { handleAttemptCompleted } from "@/modules/curriculum/events/on-attempt-completed";
import * as masteryService from "@/modules/curriculum/services/update-mastery";
import { getRecommendedProblem } from "@/modules/curriculum/services/get-recommended-problem";
import { completeAttemptWithRepository } from "@/modules/practice/services/complete-attempt";
import { startSessionWithRepository } from "@/modules/practice/services/start-session";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

const { generateProblemMock } = vi.hoisted(() => ({
  generateProblemMock: vi.fn()
}));

vi.mock("@/modules/problem-generator", () => ({
  generateProblem: generateProblemMock
}));

type ProgressRow = {
  id: string;
  userId: string;
  topicId: string;
  masteryScore: number;
  lastPracticedAt: Date | null;
};

function makeCurriculumRepo(progressRows: ProgressRow[]): CurriculumRepository {
  return {
    getTopicProgress: vi.fn().mockResolvedValue(progressRows[0] ?? null),
    getTopicProgressByUser: vi.fn().mockResolvedValue(progressRows),
    upsertTopicProgress: vi.fn().mockResolvedValue(undefined)
  };
}

function makePracticeRepo(input: {
  userId: string;
  topicId: string | null;
  isCorrect: boolean;
}) {
  const completedAttempt = {
    id: "attempt-1",
    sessionId: "session-1",
    problemId: "problem-1",
    userId: input.userId,
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:05:00.000Z",
    isCorrect: input.isCorrect,
    createdAt: "2026-01-01T00:00:00.000Z"
  };

  return {
    findActiveSession: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue({
      id: "session-created",
      userId: input.userId,
      topicId: input.topicId,
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    completeAttempt: vi.fn().mockResolvedValue(completedAttempt),
    getAttempt: vi.fn().mockResolvedValue(completedAttempt),
    getSession: vi.fn().mockResolvedValue({
      id: "session-1",
      topicId: input.topicId
    })
  };
}

describe("E2E: practice-curriculum adaptive flow", () => {
  const context = { requestId: "req-e2e" };
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    generateProblemMock.mockImplementation(async (_problemRepo, input: { topicId?: string }) => ({
      wasValidated: true,
      problem: {
        id: "generated-problem-1",
        templateId: "template-uuid-1",
        topicId: input.topicId ?? null,
        difficultyLevel: 1,
        problemLatex: "x+1=2",
        solutionLatex: "1",
        parameters: null,
        isValidated: true,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    }));
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  it("full adaptive loop: lowest mastery topic is recommended", async () => {
    vi.spyOn(masteryService, "updateMastery").mockResolvedValueOnce({
      masteryScore: 0.85,
      previousScore: 0.8
    });

    const curriculumRepo = makeCurriculumRepo([
      { id: "p2", userId: "user-1", topicId: "topic-B", masteryScore: 0.2, lastPracticedAt: null },
      { id: "p1", userId: "user-1", topicId: "topic-A", masteryScore: 0.8, lastPracticedAt: null }
    ]);
    const practiceRepo = makePracticeRepo({ userId: "user-1", topicId: "topic-A", isCorrect: true });

    unsubscribe = eventBus.subscribe(
      "attempt_completed",
      handleAttemptCompleted(curriculumRepo, practiceRepo as never)
    );

    await completeAttemptWithRepository(
      practiceRepo as never,
      {
        attemptId: "attempt-1",
        userId: "user-1",
        topicId: "topic-A",
        isCorrect: true
      },
      context
    );

    await vi.waitFor(() => {
      expect(masteryService.updateMastery).toHaveBeenCalledTimes(1);
    });

    const result = await getRecommendedProblem(
      { userId: "user-1" },
      curriculumRepo,
      {
        getTemplate: vi.fn(),
        listTemplates: vi.fn()
      } as never,
      context
    );

    expect(result.topicId).toBe("topic-B");
  });

  it("mastery update after wrong answer uses incorrect attemptResult and topic-A", async () => {
    const updateMasterySpy = vi
      .spyOn(masteryService, "updateMastery")
      .mockResolvedValueOnce({ masteryScore: 0.4, previousScore: 0.5 });

    const curriculumRepo = makeCurriculumRepo([
      { id: "p1", userId: "user-2", topicId: "topic-A", masteryScore: 0.5, lastPracticedAt: null },
      { id: "p2", userId: "user-2", topicId: "topic-B", masteryScore: 0.9, lastPracticedAt: null }
    ]);
    const practiceRepo = makePracticeRepo({ userId: "user-2", topicId: "topic-A", isCorrect: false });

    unsubscribe = eventBus.subscribe(
      "attempt_completed",
      handleAttemptCompleted(curriculumRepo, practiceRepo as never)
    );

    await completeAttemptWithRepository(
      practiceRepo as never,
      {
        attemptId: "attempt-1",
        userId: "user-2",
        topicId: "topic-A",
        isCorrect: false
      },
      context
    );

    await vi.waitFor(() => {
      expect(updateMasterySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-2",
          topicId: "topic-A",
          attemptResult: "incorrect",
          attemptId: "attempt-1"
        }),
        curriculumRepo
      );
    });
  });

  it("null topicId: mastery update skipped, session and attempt completion still succeed", async () => {
    const updateMasterySpy = vi.spyOn(masteryService, "updateMastery");
    const curriculumRepo = makeCurriculumRepo([]);
    const practiceRepo = makePracticeRepo({ userId: "user-3", topicId: null, isCorrect: true });

    unsubscribe = eventBus.subscribe(
      "attempt_completed",
      handleAttemptCompleted(curriculumRepo, practiceRepo as never)
    );

    const session = await startSessionWithRepository(
      practiceRepo as never,
      { userId: "user-3", topicId: null },
      context
    );

    const completedAttempt = await completeAttemptWithRepository(
      practiceRepo as never,
      {
        attemptId: "attempt-1",
        userId: "user-3",
        topicId: null,
        isCorrect: true
      },
      context
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(session.id).toBe("session-created");
    expect(completedAttempt.id).toBe("attempt-1");
    expect(updateMasterySpy).not.toHaveBeenCalled();
  });
});
