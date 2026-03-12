import { describe, expect, it } from "vitest";

import { createDomainEvent, CreateDomainEventInput } from "@/events/event-types";

type EventInput = CreateDomainEventInput<{ attemptId: string }>;

function buildEventInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    eventType: "attempt_completed",
    payload: { attemptId: "test-1" },
    ...overrides
  };
}

describe("createDomainEvent", () => {
  describe("event type validation", () => {
    it("accepts valid event types", () => {
      const event = createDomainEvent(buildEventInput());

      expect(event.event_type).toBe("attempt_completed");
    });

    it("trims whitespace in eventType", () => {
      const event = createDomainEvent(
        buildEventInput({ eventType: "  step_submitted  " })
      );

      expect(event.event_type).toBe("step_submitted");
    });

    it("rejects empty event type", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ eventType: "" }))
      ).toThrow("Domain events require a non-empty event_type");
    });

    it("rejects whitespace-only event type", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ eventType: "   " }))
      ).toThrow("Domain events require a non-empty event_type");
    });
  });

  describe("timestamp normalization", () => {
    it("accepts valid ISO-8601 timestamp with Z suffix", () => {
      const event = createDomainEvent(
        buildEventInput({ timestamp: "2024-01-15T10:30:00.000Z" })
      );

      expect(event.timestamp).toBe("2024-01-15T10:30:00.000Z");
    });

    it("accepts valid ISO-8601 timestamp with timezone offset", () => {
      const event = createDomainEvent(
        buildEventInput({ timestamp: "2024-01-15T16:00:00.000+05:30" })
      );

      // Normalized to UTC
      expect(event.timestamp).toBe("2024-01-15T10:30:00.000Z");
    });

    it("accepts ISO-8601 timestamp without milliseconds", () => {
      const event = createDomainEvent(
        buildEventInput({ timestamp: "2024-01-15T10:30:00Z" })
      );

      // Normalized to ISO with milliseconds
      expect(event.timestamp).toBe("2024-01-15T10:30:00.000Z");
    });

    it("normalizes timestamps to toISOString() format", () => {
      const event = createDomainEvent(
        buildEventInput({ timestamp: "2024-01-15T10:30:00.123Z" })
      );

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("rejects invalid timestamp string", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ timestamp: "not-a-date" }))
      ).toThrow("Invalid domain event timestamp");
    });

    it("rejects ambiguous timestamp format without T separator", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ timestamp: "2024-01-15 10:30:00" }))
      ).toThrow("Invalid domain event timestamp");
    });

    it("rejects date-only format", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ timestamp: "01/02/2024" }))
      ).toThrow("Invalid domain event timestamp");
    });

    it("accepts Date input", () => {
      const date = new Date("2024-01-15T10:30:00.000Z");
      const event = createDomainEvent(buildEventInput({ timestamp: date }));

      expect(event.timestamp).toBe("2024-01-15T10:30:00.000Z");
    });

    it("rejects invalid Date object", () => {
      const invalidDate = new Date("invalid");

      expect(() =>
        createDomainEvent(buildEventInput({ timestamp: invalidDate }))
      ).toThrow("Invalid domain event timestamp");
    });

    it("defaults timestamp when undefined", () => {
      const event = createDomainEvent(buildEventInput());

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("defaults timestamp when null", () => {
      // @ts-expect-error testing runtime behavior when timestamp is null
      const event = createDomainEvent(buildEventInput({ timestamp: null }));

      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("rejects empty string timestamp", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ timestamp: "" }))
      ).toThrow("Invalid domain event timestamp");
    });

    it("rejects whitespace-only timestamp", () => {
      expect(() =>
        createDomainEvent(buildEventInput({ timestamp: "   " }))
      ).toThrow("Invalid domain event timestamp");
    });
  });

  describe("payload immutability", () => {
    it("returns a frozen payload object", () => {
      const event = createDomainEvent({
        eventType: "attempt_completed",
        payload: { attemptId: "test-1", data: { nested: "value" } }
      });

      expect(Object.isFrozen(event.payload)).toBe(true);
    });

    it("prevents mutation of nested properties", () => {
      const payload = { data: { nested: "value" } };
      const event = createDomainEvent({
        eventType: "attempt_completed",
        payload
      });

      expect(() => {
        (event.payload as { data: { nested: string } }).data.nested = "changed";
      }).toThrow();
    });

    it("prevents mutation of nested objects", () => {
      const payload = { data: { nested: { deep: "value" } } };
      const event = createDomainEvent({
        eventType: "attempt_completed",
        payload
      });

      expect(() => {
        (event.payload as { data: { nested: { deep: string } } }).data.nested.deep = "changed";
      }).toThrow();
    });

    it("prevents mutation of arrays in payload", () => {
      const payload = { attemptId: "test-1", items: [1, 2, 3] as const };
      const event = createDomainEvent({
        eventType: "attempt_completed",
        payload
      });

      const items = (event.payload as { items: readonly number[] }).items;
      expect(() => {
        (items as unknown as number[]).push(4);
      }).toThrow();
    });

    it("mutating original payload does not affect stored event", () => {
      const originalPayload = { attemptId: "test-1", data: { nested: "original" } };
      const event = createDomainEvent({
        eventType: "attempt_completed",
        payload: originalPayload
      });

      // Mutate the original
      originalPayload.attemptId = "changed";
      originalPayload.data.nested = "mutated";

      // Event should be unaffected
      expect((event.payload as { attemptId: string }).attemptId).toBe("test-1");
      expect(((event.payload as { data: { nested: string } }).data).nested).toBe("original");
    });

    it("handles cyclic object structures safely", () => {
      const cyclicPayload: Record<string, unknown> = { attemptId: "test-1" };
      cyclicPayload.self = cyclicPayload;

      // Should not throw
      const event = createDomainEvent({
        eventType: "attempt_completed",
        payload: cyclicPayload
      });

      expect(event.payload).toBeDefined();
    });
  });

  describe("event structure", () => {
    it("generates a random event_id when not provided", () => {
      const event = createDomainEvent(buildEventInput());

      expect(event.event_id).toBeDefined();
      expect(event.event_id.length).toBeGreaterThan(0);
    });

    it("uses provided event_id when given", () => {
      const event = createDomainEvent(
        buildEventInput({ eventId: "custom-id-123" })
      );

      expect(event.event_id).toBe("custom-id-123");
    });
  });
});
