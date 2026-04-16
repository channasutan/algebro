import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createSupabasePracticeRepositoryMock,
  getRecommendedProblemMock,
  createSupabaseCurriculumRepositoryMock,
  createSupabaseProblemRepositoryMock,
  generateProblemMock
} = vi.hoisted(() => ({
  createSupabasePracticeRepositoryMock: vi.fn(),
  getRecommendedProblemMock: vi.fn(),
  createSupabaseCurriculumRepositoryMock: vi.fn(),
  createSupabaseProblemRepositoryMock: vi.fn(),
  generateProblemMock: vi.fn()
}));

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => logger)
}));

vi.mock("../../repositories/supabase-practice-repository", () => ({
  createSupabasePracticeRepository: createSupabasePracticeRepositoryMock
}));

vi.mock("@/modules/curriculum", () => ({
  getRecommendedProblem: getRecommendedProblemMock
}));

vi.mock("@/modules/curriculum/repositories/supabase-curriculum-repository", () => ({
  createSupabaseCurriculumRepository: createSupabaseCurriculumRepositoryMock
}));

vi.mock("@/modules/problem-generator", () => ({
  createSupabaseProblemRepository: createSupabaseProblemRepositoryMock,
  generateProblem: generateProblemMock
}));

import { getNextProblem } from "../../services/get-next-problem";
import { startSession, startSessionWithRepository } from "../../services/start-session";
import { DuplicateActiveSessionError } from "../../errors";

describe("practice start session and next problem integration", () => {
  const context = { requestId: "req-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseCurriculumRepositoryMock.mockReturnValue({});
    createSupabaseProblemRepositoryMock.mockResolvedValue({
      listTemplates: vi.fn().mockResolvedValue([])
    });
  });

  it("adaptive path: curriculum recommendation + session creation uses recommended topic", async () => {
    getRecommendedProblemMock.mockResolvedValueOnce({
      problemId: "problem-topic-x",
      topicId: "topic-x",
      difficulty: 1
    });

    const next = await getNextProblem({ userId: "user-1", topicId: null }, context);

    const repo = {
      findActiveSession: vi.fn().mockResolvedValue(null),
      createSession: vi.fn().mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        topicId: "topic-x",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z"
      })
    };

    const session = await startSessionWithRepository(
      repo as never,
      { userId: "user-1", topicId: next.topicId },
      context
    );

    expect(next).toEqual({ problemId: "problem-topic-x", topicId: "topic-x" });
    expect(repo.createSession).toHaveBeenCalledWith("user-1", "topic-x");
    expect(session.userId).toBe("user-1");
    expect(session.topicId).toBe("topic-x");
  });

  it("first-time user path: startSession still creates session when topicId is null", async () => {
    const repo = {
      findActiveSession: vi.fn().mockResolvedValue(null),
      createSession: vi.fn().mockResolvedValue({
        id: "session-2",
        userId: "user-first",
        topicId: null,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z"
      })
    };
    createSupabasePracticeRepositoryMock.mockReturnValueOnce(repo);

    const session = await startSession(
      { userId: "user-first", topicId: null },
      context
    );

    expect(repo.createSession).toHaveBeenCalledWith("user-first", null);
    expect(session.id).toBe("session-2");
    expect(session.topicId).toBeNull();
  });

  it("fallback path: curriculum throws, random generator still returns problem and session succeeds", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const listTemplates = vi.fn().mockResolvedValue([
      { id: "tpl-uuid-1", name: "template-a" }
    ]);

    getRecommendedProblemMock.mockRejectedValueOnce(new Error("curriculum unavailable"));
    createSupabaseProblemRepositoryMock.mockResolvedValueOnce({ listTemplates });
    generateProblemMock.mockResolvedValueOnce({
      wasValidated: true,
      problem: { id: "problem-fallback", topicId: "topic-fallback" }
    });

    const next = await getNextProblem(
      { userId: "user-fallback", topicId: "topic-input" },
      context
    );

    const repo = {
      findActiveSession: vi.fn().mockResolvedValue(null),
      createSession: vi.fn().mockResolvedValue({
        id: "session-3",
        userId: "user-fallback",
        topicId: "topic-fallback",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z"
      })
    };

    const session = await startSessionWithRepository(
      repo as never,
      { userId: "user-fallback", topicId: next.topicId },
      context
    );

    expect(next).toEqual({ problemId: "problem-fallback", topicId: "topic-fallback" });
    expect(repo.createSession).toHaveBeenCalledWith("user-fallback", "topic-fallback");
    expect(session.id).toBe("session-3");

    randomSpy.mockRestore();
  });

  it("fallback logging: logger.warn is called with curriculum error info", async () => {
    const warnSpy = vi.spyOn(logger, "warn");

    getRecommendedProblemMock.mockRejectedValueOnce(new Error("curriculum exploded"));
    createSupabaseProblemRepositoryMock.mockResolvedValueOnce({
      listTemplates: vi.fn().mockResolvedValue([{ id: "tpl-1", name: "template-a" }])
    });
    generateProblemMock.mockResolvedValueOnce({
      wasValidated: true,
      problem: { id: "problem-1", topicId: "topic-1" }
    });

    await getNextProblem({ userId: "user-log", topicId: "topic-input" }, context);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "practice.next-problem",
        meta: expect.objectContaining({
          reason: "curriculum_unavailable",
          error: "curriculum exploded"
        })
      })
    );
  });

  it("static guard: start-session service has no direct curriculum internal imports", () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const servicePath = path.resolve(testDir, "../../services/start-session.ts");
    const content = fs.readFileSync(servicePath, "utf8");

    expect(content).not.toContain("@/modules/curriculum/services/");
    expect(content).not.toContain("@/modules/curriculum/repositories/");
  });

  describe("idempotency", () => {
    it("calling startSession twice with same userId+topicId returns existing session without creating new one", async () => {
      const repo = {
        findActiveSession: vi.fn().mockResolvedValue({
          id: "existing-session-1",
          userId: "user-1",
          topicId: "topic-1",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z"
        }),
        createSession: vi.fn()
      };

      const session = await startSessionWithRepository(
        repo as never,
        { userId: "user-1", topicId: "topic-1" },
        context
      );

      expect(session.id).toBe("existing-session-1");
      expect(repo.findActiveSession).toHaveBeenCalledWith("user-1", "topic-1");
      expect(repo.createSession).not.toHaveBeenCalled();
    });

    it("when no active session exists, createSession is called normally", async () => {
      const repo = {
        findActiveSession: vi.fn().mockResolvedValue(null),
        createSession: vi.fn().mockResolvedValue({
          id: "new-session-1",
          userId: "user-1",
          topicId: "topic-1",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z"
        })
      };

      const session = await startSessionWithRepository(
        repo as never,
        { userId: "user-1", topicId: "topic-1" },
        context
      );

      expect(session.id).toBe("new-session-1");
      expect(repo.findActiveSession).toHaveBeenCalledWith("user-1", "topic-1");
      expect(repo.createSession).toHaveBeenCalledTimes(1);
      expect(repo.createSession).toHaveBeenCalledWith("user-1", "topic-1");
    });

    it("handles null topicId idempotency correctly", async () => {
      const existingSession = {
        id: "session-null-topic",
        userId: "user-1",
        topicId: null,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      const repo = {
        findActiveSession: vi.fn().mockResolvedValue(existingSession),
        createSession: vi.fn(),
      };

      const result = await startSessionWithRepository(
        repo as never,
        { userId: "user-1", topicId: null },
        context
      );

      expect(result.id).toBe("session-null-topic");
      expect(repo.createSession).not.toHaveBeenCalled();
      expect(repo.findActiveSession).toHaveBeenCalledWith("user-1", null);
    });

    it("recovers idempotently when createSession hits unique violation with direct cause code", async () => {
      const existingSession = {
        id: "existing-after-race-1",
        userId: "user-1",
        topicId: "topic-1",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      const repo = {
        findActiveSession: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingSession),
        createSession: vi
          .fn()
          .mockRejectedValueOnce(new Error("[practice] duplicate key", { cause: { code: "23505" } })),
      };

      const result = await startSessionWithRepository(
        repo as never,
        { userId: "user-1", topicId: "topic-1" },
        context
      );

      expect(result.id).toBe("existing-after-race-1");
      expect(repo.createSession).toHaveBeenCalledTimes(1);
      expect(repo.findActiveSession).toHaveBeenCalledTimes(2);
    });

    it("recovers when unique violation code is nested multiple cause levels deep", async () => {
      const existingSession = {
        id: "existing-after-race-2",
        userId: "user-1",
        topicId: "topic-1",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      const nestedError = new Error("repo createSession failed", {
        cause: new Error("db wrapper", {
          cause: { code: "23505", message: "duplicate key value violates unique constraint" },
        }),
      });

      const repo = {
        findActiveSession: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingSession),
        createSession: vi.fn().mockRejectedValueOnce(nestedError),
      };

      const result = await startSessionWithRepository(
        repo as never,
        { userId: "user-1", topicId: "topic-1" },
        context
      );

      expect(result.id).toBe("existing-after-race-2");
      expect(repo.createSession).toHaveBeenCalledTimes(1);
      expect(repo.findActiveSession).toHaveBeenCalledTimes(2);
    });

    it("throws DuplicateActiveSessionError when duplicate is detected but no row can be recovered", async () => {
      const repo = {
        findActiveSession: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        createSession: vi
          .fn()
          .mockRejectedValueOnce(new Error("[practice] duplicate key", { cause: { code: "23505" } })),
      };

      await expect(
        startSessionWithRepository(
          repo as never,
          { userId: "user-1", topicId: "topic-1" },
          context
        )
      ).rejects.toBeInstanceOf(DuplicateActiveSessionError);

      expect(repo.findActiveSession).toHaveBeenCalledTimes(2);
    });
  });
});
