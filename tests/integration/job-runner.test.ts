import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearJobHandlers, NonRetryableJobError, registerJobHandler, runJob } from "@/jobs/job-runner";

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

  it("returns a terminal failure when the max attempt is reached", async () => {
    registerJobHandler("material_processing", async () => {
      throw new Error("persistent failure");
    });

    const result = await runJob({
      id: "job-3",
      type: "material_processing",
      payload: { materialId: "material-3" },
      status: "pending",
      attemptCount: 2,
      maxAttempts: 3
    });

    expect(result).toEqual({
      jobId: "job-3",
      status: "terminal_failure",
      attemptCount: 3,
      errorMessage: "persistent failure"
    });
  });

  it("returns a terminal failure immediately for NonRetryableJobError", async () => {
    registerJobHandler("material_processing", async () => {
      throw new NonRetryableJobError("fatal configuration error");
    });

    const result = await runJob({
      id: "job-4",
      type: "material_processing",
      payload: { materialId: "material-4" },
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3
    });

    expect(result).toEqual({
      jobId: "job-4",
      status: "terminal_failure",
      attemptCount: 1,
      errorMessage: "fatal configuration error"
    });
  });

  it("throws an Error directly if no handler is registered", async () => {
    await expect(
      runJob({
        id: "job-5",
        type: "unknown_job_type",
        payload: {},
        status: "pending",
        attemptCount: 0,
        maxAttempts: 3
      })
    ).rejects.toThrow("No job handler registered for type: unknown_job_type");
  });
});
