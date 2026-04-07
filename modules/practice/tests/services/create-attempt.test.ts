import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createSupabasePracticeRepositoryMock } = vi.hoisted(() => ({
  createSupabasePracticeRepositoryMock: vi.fn(),
}));

vi.mock("../../repositories/supabase-practice-repository", () => ({
  createSupabasePracticeRepository: createSupabasePracticeRepositoryMock,
}));

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  createAttemptWithRepository,
} from "../../services/create-attempt";

describe("createAttempt — transactional RPC", () => {
  const context = { requestId: "req-tx-1" };

  const baseInput = {
    sessionId: "session-1",
    problemId: "problem-1",
    userId: "user-1",
    stepIndex: 0,
    stepLatex: "x + 1 = 2",
  };

  it("returns attempt and step on success", async () => {
    const attempt = {
      id: "attempt-1",
      sessionId: "session-1",
      problemId: "problem-1",
      userId: "user-1",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      isCorrect: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const step = {
      id: "step-1",
      attemptId: "attempt-1",
      stepIndex: 0,
      stepLatex: "x + 1 = 2",
      isValid: null,
      errorType: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const repo = {
      createAttemptWithStep: vi.fn().mockResolvedValue({ attempt, step }),
    };

    const result = await createAttemptWithRepository(repo as never, baseInput, context);

    expect(result.attempt.id).toBe("attempt-1");
    expect(result.step?.id).toBe("step-1");
    expect(repo.createAttemptWithStep).toHaveBeenCalledWith(
      "session-1",
      "problem-1",
      "user-1",
      0,
      "x + 1 = 2"
    );
  });

  it("rollback guard: throws when RPC fails — no orphaned attempt row", async () => {
    // The RPC itself throws (simulating Postgres rollback).
    // The test verifies the error propagates and createAttemptWithStep
    // was called exactly once (no retry creating a bare attempt).
    const repo = {
      createAttemptWithStep: vi.fn().mockRejectedValue(
        new Error("[practice] createAttemptWithStep RPC failed: step insert violated constraint")
      ),
    };

    await expect(
      createAttemptWithRepository(repo as never, baseInput, context)
    ).rejects.toThrow("createAttemptWithStep RPC failed");

    // Called once — no fallback that would leave an orphan
    expect(repo.createAttemptWithStep).toHaveBeenCalledTimes(1);
  });

  it("does not call legacy createAttempt + addStep separately", async () => {
    const repo = {
      createAttemptWithStep: vi.fn().mockResolvedValue({
        attempt: { id: "a-1" },
        step: { id: "s-1" },
      }),
      createAttempt: vi.fn(), // should never be called
      addStep: vi.fn(),        // should never be called
    };

    await createAttemptWithRepository(repo as never, baseInput, context);

    expect(repo.createAttempt).not.toHaveBeenCalled();
    expect(repo.addStep).not.toHaveBeenCalled();
  });
});
