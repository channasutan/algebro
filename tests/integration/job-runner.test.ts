import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearJobHandlers, registerJobHandler, runJob } from "@/jobs/job-runner";

describe("job runner", () => {
  beforeEach(() => {
    clearJobHandlers();
  });

  it("runs a registered handler and marks the job completed", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);

    registerJobHandler("material_processing", handler);

    const result = await runJob({
      id: "job-1",
      type: "material_processing",
      payload: { materialId: "material-1" },
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      jobId: "job-1",
      status: "completed",
      attemptCount: 1
    });
  });

  it("returns a retryable failure before the max attempt is reached", async () => {
    registerJobHandler("material_processing", async () => {
      throw new Error("temporary failure");
    });

    const result = await runJob({
      id: "job-2",
      type: "material_processing",
      payload: { materialId: "material-2" },
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3
    });

    expect(result).toEqual({
      jobId: "job-2",
      status: "retryable_failure",
      attemptCount: 1,
      errorMessage: "temporary failure"
    });
  });
});
