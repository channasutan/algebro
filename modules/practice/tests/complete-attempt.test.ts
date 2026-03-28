import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => logger)
}));

vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(undefined)
  }
}));

import { eventBus } from "@/events/event-bus";
import { completeAttemptWithRepository } from "../services/complete-attempt";

describe("completeAttemptWithRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes an attempt and returns updated attempt", async () => {
    const updatedAttempt = {
      id: "att-1",
      sessionId: "sess-1",
      problemId: "prob-1",
      userId: "usr-1",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:05:00.000Z",
      isCorrect: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    };

    const mockRepo = {
      completeAttempt: vi.fn().mockResolvedValue(updatedAttempt)
    };

    const result = await completeAttemptWithRepository(
      mockRepo as never,
      { attemptId: "att-1", userId: "usr-1", topicId: "topic-1", isCorrect: true },
      { requestId: "req-1" }
    );

    expect(mockRepo.completeAttempt).toHaveBeenCalledTimes(1);
    expect(mockRepo.completeAttempt).toHaveBeenCalledWith(
      "att-1",
      expect.objectContaining({
        isCorrect: true,
        completedAt: expect.any(String)
      })
    );
    expect(result).toEqual(updatedAttempt);
  });

  it("publishes attempt_completed with exact payload keys", async () => {
    const updatedAttempt = {
      id: "att-1",
      sessionId: "sess-1",
      problemId: "prob-42",
      userId: "usr-1",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:05:00.000Z",
      isCorrect: false,
      createdAt: "2026-01-01T00:00:00.000Z"
    };

    const mockRepo = {
      completeAttempt: vi.fn().mockResolvedValue(updatedAttempt)
    };

    await completeAttemptWithRepository(
      mockRepo as never,
      { attemptId: "att-1", userId: "usr-1", topicId: "topic-1", isCorrect: false },
      { requestId: "req-1" }
    );

    expect(vi.mocked(eventBus.publish)).toHaveBeenCalledTimes(1);
    const emitted = vi.mocked(eventBus.publish).mock.calls[0][0];
    expect(emitted.event_type).toBe("attempt_completed");
    expect(emitted.payload).toEqual({
      attempt_id: "att-1",
      user_id: "usr-1",
      topic_id: "topic-1",
      problem_id: "prob-42",
      completed_at: expect.any(String)
    });
  });

  it("topic_id falls back to empty string when topicId is null", async () => {
    const updatedAttempt = {
      id: "att-2",
      sessionId: "sess-1",
      problemId: "prob-1",
      userId: "usr-1",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      isCorrect: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    };

    const mockRepo = {
      completeAttempt: vi.fn().mockResolvedValue(updatedAttempt)
    };

    await completeAttemptWithRepository(
      mockRepo as never,
      { attemptId: "att-2", userId: "usr-1", topicId: null, isCorrect: true },
      { requestId: "req-1" }
    );

    const emitted = vi.mocked(eventBus.publish).mock.calls[0][0];
    expect(emitted.payload.topic_id).toBeNull();
  });

  it("completed_at in payload is ISO-8601 string", async () => {
    const updatedAttempt = {
      id: "att-3",
      sessionId: "sess-1",
      problemId: "prob-1",
      userId: "usr-1",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      isCorrect: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    };

    const mockRepo = {
      completeAttempt: vi.fn().mockResolvedValue(updatedAttempt)
    };

    await completeAttemptWithRepository(
      mockRepo as never,
      { attemptId: "att-3", userId: "usr-1", topicId: "topic-1", isCorrect: true },
      { requestId: "req-1" }
    );

    const emitted = vi.mocked(eventBus.publish).mock.calls[0][0];
    expect(emitted.payload.completed_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it("eventBus.publish is NOT called when repo.completeAttempt throws", async () => {
    const mockRepo = {
      completeAttempt: vi.fn().mockRejectedValue(new Error("db error"))
    };

    await expect(
      completeAttemptWithRepository(
        mockRepo as never,
        { attemptId: "att-4", userId: "usr-1", topicId: "topic-1", isCorrect: true },
        { requestId: "req-1" }
      )
    ).rejects.toThrow("db error");

    expect(vi.mocked(eventBus.publish)).not.toHaveBeenCalled();
  });

  it("preserves best-effort behavior when event publishing fails", async () => {
    const updatedAttempt = {
      id: "att-1",
      sessionId: "sess-1",
      problemId: "prob-1",
      userId: "usr-1",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:05:00.000Z",
      isCorrect: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    };

    const mockRepo = {
      completeAttempt: vi.fn().mockResolvedValue(updatedAttempt)
    };

    vi.mocked(eventBus.publish).mockRejectedValueOnce(new Error("event failure"));

    const result = await completeAttemptWithRepository(
      mockRepo as never,
      { attemptId: "att-1", userId: "usr-1", topicId: "topic-1", isCorrect: true },
      { requestId: "req-1" }
    );

    expect(mockRepo.completeAttempt).toHaveBeenCalledTimes(1);
    expect(result).toEqual(updatedAttempt);
  });

  it("logs and rethrows when repository completion fails", async () => {
    const mockRepo = {
      completeAttempt: vi.fn().mockRejectedValue(new Error("db error"))
    };

    await expect(
      completeAttemptWithRepository(
        mockRepo as never,
        { attemptId: "att-1", userId: "usr-1", topicId: "topic-1", isCorrect: true },
        { requestId: "req-1" }
      )
    ).rejects.toThrow("db error");

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
