import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.resetModules();
});

describe("registerAiTutorModule — idempotency", () => {
  it("calling registerAiTutorModule twice does not duplicate event subscriptions", async () => {
    const { registerAiTutorModule } = await import("../index");
    const { eventBus } = await import("@/events/event-bus");

    const subscribeSpy = vi.spyOn(eventBus, "subscribe");

    registerAiTutorModule();
    registerAiTutorModule();
    registerAiTutorModule();

    expect(subscribeSpy).toHaveBeenCalledTimes(0);
  });
});
