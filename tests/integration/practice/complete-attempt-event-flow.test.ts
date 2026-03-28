import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock updateMastery — keeps handler wired but avoids real DB
vi.mock("@/modules/curriculum/services/update-mastery", () => ({
  updateMastery: vi.fn().mockResolvedValue({ masteryScore: 0.5, previousScore: 0.3 }),
}));

// Mock supabase practice repo used by handler to fetch attempt + session
vi.mock("@/modules/practice/repositories/supabase-practice-repository", () => ({
  createSupabasePracticeRepository: vi.fn(() => ({
    getAttempt: vi.fn().mockResolvedValue({
      id: "att-e2e-1",
      sessionId: "sess-1",
      problemId: "prob-e2e-1",
      userId: "user-e2e-1",
      startedAt: "2026-01-15T10:00:00.000Z",
      completedAt: "2026-01-15T10:05:00.000Z",
      isCorrect: true,
      createdAt: "2026-01-15T10:00:00.000Z",
    }),
    getSession: vi.fn().mockResolvedValue({
      id: "sess-1",
      topicId: "topic-algebra",
    }),
    completeAttempt: vi.fn(),
  })),
}));

import { updateMastery } from "@/modules/curriculum/services/update-mastery";
const mockUpdateMastery = vi.mocked(updateMastery);

// Practice repo mock for completeAttemptWithRepository
function makePracticeRepo() {
  return {
    completeAttempt: vi.fn().mockResolvedValue({
      id: "att-e2e-1",
      sessionId: "sess-1",
      problemId: "prob-e2e-1",
      userId: "user-e2e-1",
      startedAt: "2026-01-15T10:00:00.000Z",
      completedAt: "2026-01-15T10:05:00.000Z",
      isCorrect: true,
      createdAt: "2026-01-15T10:00:00.000Z",
    }),
  };
}

describe("E2E: attempt_completed event flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("completeAttemptWithRepository() → eventBus → handleAttemptCompleted → updateMastery()", async () => {
    // Bootstrap curriculum module fresh (dynamic import after resetModules)
    const { ensureModulesBootstrapped } = await import("@/modules/bootstrap");
    await ensureModulesBootstrapped();

    const { completeAttemptWithRepository } = await import(
      "@/modules/practice/services/complete-attempt"
    );

    const practiceRepo = makePracticeRepo();

    await completeAttemptWithRepository(
      practiceRepo as never,
      { attemptId: "att-e2e-1", userId: "user-e2e-1", topicId: "topic-algebra", isCorrect: true },
      { requestId: "req-e2e-1" }
    );

    // Fire-and-forget: wait for async handler
    await vi.waitFor(() => {
      expect(mockUpdateMastery).toHaveBeenCalledOnce();
    });

    expect(mockUpdateMastery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-e2e-1",
        topicId: "topic-algebra",
        attemptResult: "correct",
      }),
      expect.anything()
    );
  });

  it("event_type published matches ATTEMPT_COMPLETED constant", async () => {
    const { eventBus } = await import("@/events/event-bus");
    const publishSpy = vi.spyOn(eventBus, "publish");

    const { ensureModulesBootstrapped } = await import("@/modules/bootstrap");
    await ensureModulesBootstrapped();

    const { completeAttemptWithRepository } = await import(
      "@/modules/practice/services/complete-attempt"
    );

    await completeAttemptWithRepository(
      makePracticeRepo() as never,
      { attemptId: "att-e2e-2", userId: "user-e2e-2", topicId: "topic-algebra", isCorrect: false },
      { requestId: "req-e2e-2" }
    );

    expect(publishSpy).toHaveBeenCalledOnce();
    const [event] = publishSpy.mock.calls[0];
    expect(event.event_type).toBe("attempt_completed");
  });

  it("repo.completeAttempt() throws → updateMastery NOT called", async () => {
    const { ensureModulesBootstrapped } = await import("@/modules/bootstrap");
    await ensureModulesBootstrapped();

    const { completeAttemptWithRepository } = await import(
      "@/modules/practice/services/complete-attempt"
    );

    const failRepo = {
      completeAttempt: vi.fn().mockRejectedValue(new Error("DB failure")),
    };

    await expect(
      completeAttemptWithRepository(
        failRepo as never,
        { attemptId: "att-fail", userId: "user-fail", topicId: "topic-1", isCorrect: true },
        { requestId: "req-fail" }
      )
    ).rejects.toThrow("DB failure");

    // Give event loop a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(mockUpdateMastery).not.toHaveBeenCalled();
  });
});
