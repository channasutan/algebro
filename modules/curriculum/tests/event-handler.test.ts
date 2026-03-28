import { vi, describe, it, expect, beforeEach } from "vitest";
import { handleAttemptCompleted } from "../events/on-attempt-completed";
import { updateMastery } from "../services/update-mastery";
import type { CurriculumRepository } from "../repositories/supabase-curriculum-repository";
import type { AttemptCompletedEvent } from "@/events/attempt-events";

// ── Mock Observability ──────────────────────────────────────────────────────
vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
}));

// ── Mock updateMastery ──────────────────────────────────────────────────────
vi.mock("../services/update-mastery", () => ({
  updateMastery: vi.fn(),
}));

const mockUpdateMastery = vi.mocked(updateMastery);

// ── Mock Practice Repository ────────────────────────────────────────────────
vi.mock("@/modules/practice/repositories/supabase-practice-repository", () => ({
  createSupabasePracticeRepository: vi.fn(() => ({
    getAttempt: vi.fn().mockResolvedValue({
      id: "att-1",
      userId: "user-1",
      sessionId: "sess-1",
      isCorrect: true,
    }),
    getSession: vi.fn().mockResolvedValue({
      id: "sess-1",
      topicId: "topic-1",
    }),
  })),
}));

// ── Test Setup ──────────────────────────────────────────────────────────────
function makeMockRepo(): CurriculumRepository {
  return {
    getTopicProgress: vi.fn(),
    upsertTopicProgress: vi.fn(),
    getTopicProgressByUser: vi.fn(),
  };
}

function makeMockEvent(): AttemptCompletedEvent {
  return {
    event_id: "test-event-123",
    event_type: "attempt_completed",
    timestamp: "2026-03-28T00:00:00.000Z",
    payload: {
      attempt_id: "att-1",
      user_id: "user-1",
      problem_id: "prob-1",
      topic_id: "topic-1",
      completed_at: "2026-03-28T00:00:00.000Z",
    },
  };
}

describe("handleAttemptCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateMastery with correct args", async () => {
    const repo = makeMockRepo();
    const handler = handleAttemptCompleted(repo);
    const event = makeMockEvent();

    await handler(event);

    expect(mockUpdateMastery).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        topicId: "topic-1",
        attemptResult: "correct",
        attemptId: "att-1",
        completedAt: new Date("2026-03-28T00:00:00.000Z"),
      }),
      repo
    );
  });

  it("does not throw when updateMastery rejects", async () => {
    mockUpdateMastery.mockRejectedValueOnce(new Error("Simulated failure"));
    const repo = makeMockRepo();
    const handler = handleAttemptCompleted(repo);
    const event = makeMockEvent();

    await expect(handler(event)).resolves.not.toThrow();
  });

  it("does not mutate event.payload", async () => {
    const repo = makeMockRepo();
    const handler = handleAttemptCompleted(repo);
    const event = makeMockEvent();

    const originalPayloadString = JSON.stringify(event.payload);

    await handler(event);

    expect(JSON.stringify(event.payload)).toBe(originalPayloadString);
  });

  it("idempotency: calling handler 3x calls updateMastery 3x", async () => {
    const repo = makeMockRepo();
    const handler = handleAttemptCompleted(repo);
    const event = makeMockEvent();

    await handler(event);
    await handler(event);
    await handler(event);

    expect(mockUpdateMastery).toHaveBeenCalledTimes(3);
  });
});
