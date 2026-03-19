import { describe, it, expect, vi, beforeEach } from "vitest";
import { startSessionWithRepository } from "@/modules/practice/services/start-session";
import { createAttemptWithRepository } from "@/modules/practice/services/create-attempt";
import { submitStepWithRepository } from "@/modules/practice/services/submit-step";
import type { PracticeRepository } from "@/modules/practice/repositories/practice-repository";
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

describe("Practice Loop Service Integration", () => {
  let mockRepo: Mocked<PracticeRepository>;
  const testUserId = TEST_USER_ID;
  const context = { requestId: "req-123" };

  beforeEach(() => {
    vi.resetAllMocks();
    mockRepo = {
      createSession: vi.fn(),
      getSession: vi.fn(),
      createAttempt: vi.fn(),
      getAttempt: vi.fn(),
      updateAttempt: vi.fn(),
      addStep: vi.fn(),
      getSteps: vi.fn(),
      updateStep: vi.fn(),
    } as unknown as Mocked<PracticeRepository>;
  });

  it("should complete a basic practice flow: start session -> create attempt -> submit steps", async () => {
    // 1. Success starting a session
    const mockSession = { 
      id: "session-1", 
      userId: testUserId, 
      topicId: "topic-1", 
      startedAt: new Date().toISOString(), 
      completedAt: null, 
      createdAt: new Date().toISOString() 
    };
    mockRepo.createSession.mockResolvedValue(mockSession);

    const session = await startSessionWithRepository(mockRepo, {
      userId: testUserId,
      topicId: "topic-1"
    }, context);

    expect(session).toEqual(mockSession);
    expect(mockRepo.createSession).toHaveBeenCalledWith(testUserId, "topic-1");

    // 2. Success creating an attempt
    const mockAttempt = { 
      id: "attempt-1", 
      sessionId: "session-1", 
      problemId: "problem-1", 
      userId: testUserId, 
      startedAt: new Date().toISOString(), 
      completedAt: null, 
      isCorrect: null, 
      createdAt: new Date().toISOString() 
    };
    mockRepo.createAttempt.mockResolvedValue(mockAttempt);

    const attempt = await createAttemptWithRepository(mockRepo, {
      sessionId: "session-1",
      problemId: "problem-1",
      userId: testUserId
    }, context);

    expect(attempt).toEqual(mockAttempt);
    expect(mockRepo.createAttempt).toHaveBeenCalledWith("session-1", "problem-1", testUserId);

    // 3. Success submitting steps
    const mockStep1 = { 
      id: "step-1", 
      attemptId: "attempt-1", 
      stepIndex: 0, 
      stepLatex: "2x = 4", 
      isValid: true, 
      errorType: null, 
      createdAt: new Date().toISOString() 
    };
    mockRepo.getSteps.mockResolvedValue([]);
    mockRepo.addStep.mockResolvedValue({ ...mockStep1, isValid: null });
    mockRepo.updateStep.mockResolvedValue(mockStep1);

    const step1 = await submitStepWithRepository(mockRepo, {
      attemptId: "attempt-1",
      userId: testUserId,
      stepLatex: "2x = 4"
    }, context);

    expect(step1).toEqual(mockStep1);
    expect(mockRepo.addStep).toHaveBeenCalledWith("attempt-1", 0, "2x = 4");
    expect(mockRepo.updateStep).toHaveBeenCalledWith(expect.any(String), { isValid: true });
  });

  it("should throw error when submitting empty step", async () => {
    await expect(submitStepWithRepository(mockRepo, {
      attemptId: "attempt-1",
      userId: testUserId,
      stepLatex: "  "
    }, context)).rejects.toThrow("[practice] Step cannot be empty");
  });
});
