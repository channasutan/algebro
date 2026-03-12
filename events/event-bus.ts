import type { DomainEvent, EventHandler, EventUnsubscribe } from "@/events/event-types";

export type EventBus = {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): EventUnsubscribe;
};

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    async publish(event) {
      const registeredHandlers = handlers.get(event.event_type);

      if (!registeredHandlers || registeredHandlers.size === 0) {
        return;
      }

      await Promise.all(Array.from(registeredHandlers, (handler) => handler(event)));
    },

    subscribe(eventType, handler) {
      const eventHandlers = handlers.get(eventType) ?? new Set<EventHandler>();

      eventHandlers.add(handler);
      handlers.set(eventType, eventHandlers);

      return () => {
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
