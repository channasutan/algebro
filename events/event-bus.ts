import type {
  DomainEvent,
  DomainEventType,
  EventHandler,
  EventUnsubscribe
} from "@/events/event-types";

export type EventBus = {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: DomainEventType, handler: EventHandler): EventUnsubscribe;
};

// NOTE: We intentionally use an in-process event bus for MVP speed and simplicity.
// This keeps module wiring lightweight, but events are not durable across process
// restarts and are not fan-out safe across multiple instances. If reliability,
// replay, or cross-instance delivery becomes required, migrate to a durable queue.
export function createEventBus(): EventBus {
  const handlers = new Map<DomainEventType, Set<EventHandler>>();

  return {
    async publish(event) {
      const registeredHandlers = handlers.get(event.event_type);

      if (!registeredHandlers || registeredHandlers.size === 0) {
        return;
      }

      const handlerSnapshot = Array.from(registeredHandlers);

      await Promise.allSettled(handlerSnapshot.map((handler) => Promise.resolve().then(() => handler(event))));
    },

    subscribe(eventType, handler) {
      const normalizedEventType = eventType.trim() as DomainEventType;

      if (!normalizedEventType) {
        throw new Error("Event type must be a non-empty string");
      }

      const eventHandlers = handlers.get(normalizedEventType) ?? new Set<EventHandler>();

      eventHandlers.add(handler);
      handlers.set(normalizedEventType, eventHandlers);

      let unsubscribed = false;

      return () => {
        if (unsubscribed) {
          return;
        }

        unsubscribed = true;

        const currentHandlers = handlers.get(normalizedEventType);

        if (!currentHandlers) {
          return;
        }

        currentHandlers.delete(handler);

        if (currentHandlers.size === 0) {
          handlers.delete(normalizedEventType);
        }
      };
    }
  };
}

export const eventBus = createEventBus();
