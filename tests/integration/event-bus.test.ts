import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "@/events/event-bus";
import { createDomainEvent } from "@/events/event-types";

describe("event bus", () => {
  it("publishes events to subscribed handlers", async () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const event = createDomainEvent({
      eventType: "attempt_completed",
      payload: { attemptId: "attempt-1" }
    });

    bus.subscribe("attempt_completed", handler);

    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("stops delivering events after unsubscribe", async () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const event = createDomainEvent({
      eventType: "attempt_completed",
      payload: { attemptId: "attempt-2" }
    });

    const unsubscribe = bus.subscribe("attempt_completed", handler);
    unsubscribe();

    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
