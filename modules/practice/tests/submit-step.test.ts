import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/observability", () => ({
  createServiceLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
}));

vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock("@/modules/step-validation", () => ({
  validateStep: vi.fn()
}));

import { eventBus } from "@/events/event-bus";
import { validateStep } from "@/modules/step-validation";
import { submitStepWithRepository } from "../services/submit-step";

describe("submitStepWithRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits step_validated event with correct payload after step is saved", async () => {
    vi.mocked(validateStep).mockResolvedValueOnce({
      isValid: true,
      errorType: null,
      stepType: "symbolic_transformation"
    });

    const mockRepo = {
      getSteps: vi.fn().mockResolvedValue([{ stepLatex: "2x+4" }]),
      addStep: vi.fn().mockResolvedValue({ id: "step-1", stepLatex: "2x=4" }),
      updateStep: vi.fn().mockResolvedValue({ id: "step-1", stepLatex: "2x=4", isValid: true, errorType: null })
    };

    await submitStepWithRepository(
      mockRepo as never,
      { attemptId: "att-1", userId: "usr-1", stepLatex: "2x=4" },
      { requestId: "req-1" }
    );

    expect(vi.mocked(eventBus.publish)).toHaveBeenCalledOnce();
    const emitted = vi.mocked(eventBus.publish).mock.calls[0][0];
    expect(emitted.event_type).toBe("step_validated");
    expect(emitted.payload.is_valid).toBe(true);
    expect(emitted.payload.step_type).toBe("symbolic_transformation");
    expect(emitted.payload.attempt_id).toBe("att-1");
  });

  it("does NOT emit step_validated when repo.updateStep throws", async () => {
    vi.mocked(validateStep).mockResolvedValueOnce({
      isValid: true,
      errorType: null,
      stepType: "symbolic_transformation"
    });

    const mockRepo = {
      getSteps: vi.fn().mockResolvedValue([{ stepLatex: "2x+4" }]),
      addStep: vi.fn().mockResolvedValue({ id: "step-1", stepLatex: "2x=4" }),
      updateStep: vi.fn().mockRejectedValueOnce(new Error("db error"))
    };

    await expect(
      submitStepWithRepository(
        mockRepo as never,
        { attemptId: "att-1", userId: "usr-1", stepLatex: "2x=4" },
        { requestId: "req-1" }
      )
    ).rejects.toThrow("db error");

    expect(vi.mocked(eventBus.publish)).not.toHaveBeenCalled();
  });
});
