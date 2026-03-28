import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { AttemptCompletedPayload } from "@/events/attempt-events";

// ── Mock Supabase Clients ───────────────────────────────────────────────────
vi.mock("@/lib/supabase/admin-client", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server-client", () => ({
  getSupabaseServerClient: vi.fn(),
}));

// We mock update-mastery to avoid any service logic
vi.mock("../services/update-mastery", () => ({
  updateMastery: vi.fn().mockResolvedValue({ masteryScore: 1, previousScore: 0 }),
}));

describe("Curriculum Bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers Curriculum module and ATTEMPT_COMPLETED triggers no errors", async () => {
    // Dynamic import inside test after vi.resetModules() guarantees fresh module evaluation
    const { ensureModulesBootstrapped } = await import("@/modules/bootstrap");
    const { eventBus } = await import("@/events/event-bus");
    const { createDomainEvent } = await import("@/events/event-types");
    const { ATTEMPT_COMPLETED } = await import("@/events/attempt-events");

    // Start bootstrap
    await ensureModulesBootstrapped();

    // Create an event using the correct payload Type
    const event = createDomainEvent<AttemptCompletedPayload>({
      eventType: ATTEMPT_COMPLETED,
      payload: {
        attempt_id: "att-1",
        user_id: "user-1",
        problem_id: "prob-1",
        topic_id: "topic-1",
        completed_at: "2026-03-28T00:00:00.000Z",
      },
    });

    // We verify the publish call resolves without errors
    await expect(eventBus.publish(event)).resolves.not.toThrow();
  });
});
