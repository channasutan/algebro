import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "@/events/event-bus";
import { createDomainEvent, DomainEvent } from "@/events/event-types";

describe("event bus", () => {
  const createBus = () => createEventBus();

  const createTestEvent = (attemptId: string): DomainEvent =>
    createDomainEvent({
      eventType: "attempt_completed",
      payload: { attemptId }
    });

  it("does not throw when publishing with no subscribers", async () => {
    const bus = createBus();
    const event = createTestEvent("attempt-0");

    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it("invokes a single subscriber", async () => {
    const bus = createBus();
    const handler = vi.fn();
    const event = createTestEvent("attempt-1");

    bus.subscribe("attempt_completed", handler);

    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("invokes multiple subscribers", async () => {
    const bus = createBus();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const event = createTestEvent("attempt-1b");

    bus.subscribe("attempt_completed", firstHandler);
    bus.subscribe("attempt_completed", secondHandler);

    await bus.publish(event);

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(firstHandler).toHaveBeenCalledWith(event);
    expect(secondHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledWith(event);
  });

  it("stops delivering events after unsubscribe", async () => {
    const bus = createBus();
    const handler = vi.fn();
    const event = createTestEvent("attempt-2");

    const unsubscribe = bus.subscribe("attempt_completed", handler);
    unsubscribe();

    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("awaits async handlers", async () => {
    const bus = createBus();
    const completionSpy = vi.fn();
    const event = createTestEvent("attempt-3");

    bus.subscribe("attempt_completed", async () => {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          completionSpy();
          resolve();
        }, 0);
      });
    });

    await bus.publish(event);

    expect(completionSpy).toHaveBeenCalledTimes(1);
  });

  it("continues invoking other handlers when one fails", async () => {
    const bus = createBus();
    const successfulHandler = vi.fn();
    const event = createTestEvent("attempt-4");

    bus.subscribe("attempt_completed", async () => {
      throw new Error("handler failure");
    });
    bus.subscribe("attempt_completed", successfulHandler);

    await expect(bus.publish(event)).resolves.toBeUndefined();

    expect(successfulHandler).toHaveBeenCalledTimes(1);
    expect(successfulHandler).toHaveBeenCalledWith(event);
  });

  it("continues invoking other handlers when one throws synchronously", async () => {
    const bus = createBus();
    const successfulHandler = vi.fn();
    const event = createTestEvent("attempt-5");

    // First handler throws synchronously (not async)
    bus.subscribe("attempt_completed", () => {
      throw new Error("sync handler failure");
    });
    bus.subscribe("attempt_completed", successfulHandler);

    await expect(bus.publish(event)).resolves.toBeUndefined();

    expect(successfulHandler).toHaveBeenCalledTimes(1);
    expect(successfulHandler).toHaveBeenCalledWith(event);
  });
});
