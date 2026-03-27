import { beforeEach, describe, expect, it, vi } from "vitest";
import { NonRetryableJobError } from "@/jobs/job-runner";
import {
  populatePoolHandler,
  POPULATE_POOL_JOB
} from "@/jobs/handlers/populate-pool";

vi.mock("@/modules/problem-generator", () => ({
  populatePool: vi.fn()
}));

vi.mock("@/modules/problem-generator/repositories/supabase-problem-repository", () => ({
  createSupabaseProblemRepository: vi.fn()
}));

import { populatePool } from "@/modules/problem-generator";
import { createSupabaseProblemRepository } from "@/modules/problem-generator/repositories/supabase-problem-repository";

describe("populatePoolHandler", () => {
  const makeJob = (payload: Record<string, unknown>) => ({
    id: "job-1",
    type: POPULATE_POOL_JOB,
    payload,
    status: "pending" as const,
    attemptCount: 0,
    maxAttempts: 3
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully runs populatePool when payload is valid", async () => {
    const repo = { name: "repo" };
    vi.mocked(createSupabaseProblemRepository).mockResolvedValue(repo as never);
    vi.mocked(populatePool).mockResolvedValue({ generated: 3, failed: 0 });

    await expect(
      populatePoolHandler(
        makeJob({
          templateId: "tpl-1",
          topicId: "topic-1",
          difficulty: 5,
          count: 20,
          batchSize: 5
        })
      )
    ).resolves.toBeUndefined();

    expect(createSupabaseProblemRepository).toHaveBeenCalledTimes(1);
    expect(populatePool).toHaveBeenCalledTimes(1);
    expect(populatePool).toHaveBeenCalledWith(
      repo,
      {
        templateId: "tpl-1",
        topicId: "topic-1",
        difficulty: 5,
        count: 20,
        batchSize: 5
      },
      { requestId: "job-1" }
    );
  });

  it("throws NonRetryableJobError when generated is 0", async () => {
    vi.mocked(createSupabaseProblemRepository).mockResolvedValue({} as never);
    vi.mocked(populatePool).mockResolvedValue({ generated: 0, failed: 5 });

    await expect(
      populatePoolHandler(
        makeJob({
          templateId: "tpl-1",
          topicId: "topic-1",
          difficulty: 2,
          count: 5
        })
      )
    ).rejects.toBeInstanceOf(NonRetryableJobError);
  });
});
