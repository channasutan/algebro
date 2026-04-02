import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { createEventBus, type EventBus } from "@/events/event-bus";
import { createDomainEvent, type DomainEvent } from "@/events/event-types";
import { eventBus } from "@/events/event-bus";
import { generateHint } from "@/modules/ai-tutor";
import { geminiClient } from "@/infrastructure/ai/gemini-client";
import { checkFeatureAccess } from "@/modules/billing";
import type { GenerateHintInput } from "@/modules/ai-tutor/contracts/generate-hint";

vi.mock("server-only", () => ({}));

vi.mock("@/modules/billing", () => ({
  checkFeatureAccess: vi.fn()
}));

vi.mock("@/config/env.server-entry", () => ({
  getFreeHintLimit: vi.fn().mockReturnValue(3)
}));

vi.mock("@/infrastructure/ai/gemini-client", () => ({
  geminiClient: {
    generateContent: vi.fn()
  }
}));

const { getHintUsageMock, incrementHintUsageMock } = vi.hoisted(() => ({
  getHintUsageMock: vi.fn(),
  incrementHintUsageMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@/modules/ai-tutor/repositories/supabase-ai-tutor-repository", () => ({
  createSupabaseAiTutorRepository: vi.fn(() => ({
    getHintUsage: getHintUsageMock,
    incrementHintUsage: incrementHintUsageMock
  }))
}));

/**
 * Helper to create a test event and subscribe a handler.
 * Publishing is done explicitly in tests.
 */
function subscribeAndCreateEvent<T extends { userId: string }>(
  bus: EventBus,
  eventType: string,
  payload: T,
  subscriber: Mock
): DomainEvent {
  const event = createDomainEvent({
    eventType,
    payload
  });

  bus.subscribe(eventType, subscriber);
  return event;
}

/**
 * Helper to verify event delivery assertions.
 */
function expectEventDelivered(
  subscriber: Mock,
  eventType: string,
  expectedUserId: string
): void {
  expect(subscriber).toHaveBeenCalledTimes(1);
  const received = subscriber.mock.calls[0][0];
  expect(received.event_type).toBe(eventType);
  expect(received.payload.userId).toBe(expectedUserId);
}

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

  describe("Phase 2 Event Subscribers", () => {
    it("delivers auth_user_registered events to subscribers", async () => {
      const bus = createBus();
      const subscriber = vi.fn();
      const payload = {
        userId: "user-789",
        email: "subscriber@example.com",
        registeredAt: new Date().toISOString(),
        source: "email"
      };

      const event = subscribeAndCreateEvent(bus, "auth_user_registered", payload, subscriber);

      await bus.publish(event);

      expectEventDelivered(subscriber, "auth_user_registered", "user-789");
    });

    it("delivers user_profile_initialized events to subscribers", async () => {
      const bus = createBus();
      const subscriber = vi.fn();
      const payload = { userId: "user-123" };

      const event = subscribeAndCreateEvent(bus, "user_profile_initialized", payload, subscriber);

      await bus.publish(event);

      expectEventDelivered(subscriber, "user_profile_initialized", "user-123");
    });

    it("delivers user_profile_updated events to subscribers", async () => {
      const bus = createBus();
      const subscriber = vi.fn();
      const payload = {
        userId: "user-123",
        changedFields: {
          display_name: "Test Name"
        },
        updatedAt: "2024-01-01T00:00:00Z"
      };

      const event = subscribeAndCreateEvent(bus, "user_profile_updated", payload, subscriber);

      await bus.publish(event);

      expect(subscriber).toHaveBeenCalledTimes(1);
      const received = subscriber.mock.calls[0][0];
      expect(received.event_type).toBe("user_profile_updated");
      expect(received.payload.userId).toBe("user-123");
      expect(received.payload.changedFields.display_name).toBe("Test Name");
    });
  });
});

describe("ai_hint_requested emission", () => {
  const makeInput = (hintCount: number): GenerateHintInput => ({
    userId: "u-1",
    problemId: "p-1",
    problemLatex: "x^2-4=0",
    studentStepLatex: "x=2",
    errorType: null,
    previousStepsLatex: [],
    hintCount
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(eventBus, "publish");
    vi.mocked(checkFeatureAccess).mockResolvedValue({ allowed: true, planTier: "free" });
    vi.mocked(geminiClient.generateContent).mockResolvedValue({
      candidates: [{ content: { parts: [{ text: "Here is your hint." }] } }],
      promptFeedback: {}
    });
    getHintUsageMock.mockResolvedValue(1);
    incrementHintUsageMock.mockResolvedValue(undefined);
  });

  it("publishes ai_hint_requested exactly once on success", async () => {
    await generateHint(makeInput(0));

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "ai_hint_requested",
        payload: expect.objectContaining({
          userId: "u-1",
          problemId: "p-1"
        })
      })
    );
  });

  it("does not publish when quota is exceeded", async () => {
    getHintUsageMock.mockResolvedValue(3);

    await generateHint(makeInput(3));

    expect(eventBus.publish).toHaveBeenCalledTimes(0);
  });

  it("does not publish when Gemini throws", async () => {
    vi.mocked(geminiClient.generateContent).mockRejectedValueOnce(new Error("AI unavailable"));

    await generateHint(makeInput(0));

    expect(eventBus.publish).toHaveBeenCalledTimes(0);
  });

  it("publishes twice on two sequential successful hints", async () => {
    await generateHint(makeInput(0));
    await generateHint(makeInput(1));

    expect(eventBus.publish).toHaveBeenCalledTimes(2);
  });
});
