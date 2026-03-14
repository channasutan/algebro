import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clearJobHandlers, registerJobHandler, runJob } from "@/jobs/job-runner";

describe("job runner payload validation", () => {
  beforeEach(() => {
    clearJobHandlers();
  });

  it("executes normally without a schema (backward compatibility)", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    registerJobHandler("test_job", handler);

    const result = await runJob({
      id: "job-1",
      type: "test_job",
      payload: { foo: "bar" },
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("completed");
  });

  it("executes successfully with a valid payload when a schema is present", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const schema = z.object({
      foo: z.string()
    });

    registerJobHandler("test_job", { handler, schema });

    const result = await runJob({
      id: "job-2",
      type: "test_job",
      payload: { foo: "bar" },
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("completed");
  });

  it("fails with terminal failure when payload does not match the schema", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const schema = z.object({
      foo: z.string()
    });

    registerJobHandler("test_job", { handler, schema });

    const result = await runJob({
      id: "job-3",
      type: "test_job",
      payload: { foo: 123 }, // Invalid type: expected string, got number
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.status).toBe("terminal_failure");
    expect(result.errorMessage).toContain("Invalid payload for job \"test_job\"");
  });
});
