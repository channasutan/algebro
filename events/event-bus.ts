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

export function createEventBus(): EventBus {
  const handlers = new Map<DomainEventType, Set<EventHandler>>();

  return {
    async publish(event) {
      const registeredHandlers = handlers.get(event.event_type);

      if (!registeredHandlers || registeredHandlers.size === 0) {
        return;
      }

      const handlerSnapshot = Array.from(registeredHandlers);

      await Promise.allSettled(handlerSnapshot.map((handler) => Promise.resolve(handler(event))));
    },

    subscribe(eventType, handler) {
      const eventHandlers = handlers.get(eventType) ?? new Set<EventHandler>();

      eventHandlers.add(handler);
      handlers.set(eventType, eventHandlers);

      let unsubscribed = false;

      return () => {
        if (unsubscribed) {
          return;
        }

        unsubscribed = true;

        const currentHandlers = handlers.get(eventType);

        if (!currentHandlers) {
          return;
        }

        currentHandlers.delete(handler);

        if (currentHandlers.size === 0) {
          handlers.delete(eventType);
        }
      };
    }
  };
}

export const eventBus = createEventBus();
