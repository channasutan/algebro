import { describe, it, expect, vi, beforeEach } from "vitest";
import { startSessionWithRepository, createAttemptWithRepository, submitStepWithRepository } from "@/modules/practice";
import type { PracticeRepository, PracticeSession, Attempt, SolutionStep } from "@/modules/practice";
import type { CreateAttemptResult } from "@/modules/practice/services/create-attempt";
import type { Mocked } from "vitest";
import { TEST_USER_ID } from "../test-constants";

// Mock observability
vi.mock("@/lib/observability", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  createServiceLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
}));

/**
 * Sets up a mock session for testing the practice flow.
 * Configures mockRepo.createSession and calls startSessionWithRepository.
 */
async function setupMockSession(
  mockRepo: Mocked<PracticeRepository>,
  testUserId: string,
  context: { requestId: string }
): Promise<{ session: PracticeSession; mockSession: PracticeSession }> {
  const mockSession: PracticeSession = {
    id: "session-1",
    userId: testUserId,
    topicId: "topic-1",
    startedAt: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  mockRepo.findActiveSession.mockResolvedValue(null);
  mockRepo.createSession.mockResolvedValue(mockSession);

  const session = await startSessionWithRepository(
    mockRepo,
    { userId: testUserId, topicId: "topic-1" },
    context
  );

  expect(session).toEqual(mockSession);
  expect(mockRepo.createSession).toHaveBeenCalledWith(testUserId, "topic-1");

  return { session, mockSession };
}

/**
 * Sets up a mock attempt with step for testing the practice flow.
 * Configures mockRepo.createAttemptWithStep and calls createAttemptWithRepository.
 */
async function setupMockAttempt(
  mockRepo: Mocked<PracticeRepository>,
  sessionId: string,
  testUserId: string,
  context: { requestId: string }
): Promise<{
  attemptResult: CreateAttemptResult;
  mockAttempt: Attempt;
  mockStep: SolutionStep;
}> {
  const mockAttempt: Attempt = {
    id: "attempt-1",
    sessionId: sessionId,
    problemId: "problem-1",
    userId: testUserId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    isCorrect: null,
    createdAt: new Date().toISOString(),
  };
  const mockStep: SolutionStep = {
    id: "step-0",
    attemptId: "attempt-1",
    stepIndex: 0,
    stepLatex: "x + 1 = 2",
    isValid: null,
    errorType: null,
    createdAt: new Date().toISOString(),
  };
  mockRepo.createAttemptWithStep.mockResolvedValue({ attempt: mockAttempt, step: mockStep });

  const attemptResult = await createAttemptWithRepository(
    mockRepo,
    {
      sessionId: sessionId,
      problemId: "problem-1",
      userId: testUserId,
      stepIndex: 0,
      stepLatex: "x + 1 = 2",
    },
    context
  );

  expect(attemptResult.attempt).toEqual(mockAttempt);
  expect(attemptResult.step).toEqual(mockStep);
  expect(mockRepo.createAttemptWithStep).toHaveBeenCalledWith({
    sessionId: sessionId,
    problemId: "problem-1",
    stepIndex: 0,
    stepLatex: "x + 1 = 2",
  });

  return { attemptResult, mockAttempt, mockStep };
}

describe("Practice Loop Service Integration", () => {
  let mockRepo: Mocked<PracticeRepository>;
  const testUserId = TEST_USER_ID;
  const context = { requestId: "req-123" };

  beforeEach(() => {
    vi.resetAllMocks();
    mockRepo = {
      createSession: vi.fn(),
      getSession: vi.fn(),
      findActiveSession: vi.fn(),
      createAttempt: vi.fn(),
      getAttempt: vi.fn(),
      updateAttempt: vi.fn(),
      completeAttempt: vi.fn(),
      createAttemptWithStep: vi.fn(),
      addStep: vi.fn(),
      getSteps: vi.fn(),
      updateStep: vi.fn(),
    } as unknown as Mocked<PracticeRepository>;
  });

  it("should complete a basic practice flow: start session -> create attempt -> submit steps", async () => {
    // Phase 1: Setup mock session
    const { session } = await setupMockSession(mockRepo, testUserId, context);

    // Phase 2: Setup mock attempt with step
    await setupMockAttempt(mockRepo, session.id, testUserId, context);

    // Phase 3: Submit step (kept inline for narrative clarity)
    const mockStep1 = {
      id: "step-1",
      attemptId: "attempt-1",
      stepIndex: 0,
      stepLatex: "2x = 4",
      isValid: true,
      errorType: null,
      createdAt: new Date().toISOString(),
    };
    mockRepo.getSteps.mockResolvedValue([]);
    mockRepo.addStep.mockResolvedValue({ ...mockStep1, isValid: null });
    mockRepo.updateStep.mockResolvedValue(mockStep1);

    const step1 = await submitStepWithRepository(mockRepo, {
      attemptId: "attempt-1",
      userId: testUserId,
      stepLatex: "2x = 4",
    }, context);

    expect(step1).toEqual(mockStep1);
    expect(mockRepo.addStep).toHaveBeenCalledWith("attempt-1", 0, "2x = 4");
    expect(mockRepo.updateStep).toHaveBeenCalledWith(expect.any(String), { isValid: true, errorType: null });
  });

  it("should throw error when submitting empty step", async () => {
    await expect(
      submitStepWithRepository(mockRepo, {
        attemptId: "attempt-1",
        userId: testUserId,
        stepLatex: "  ",
      }, context)
    ).rejects.toThrow("[practice] Step cannot be empty");
  });
});
