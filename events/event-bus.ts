import type {
  DomainEvent,
  DomainEventType,
  EventHandler,
  EventUnsubscribe
} from "@/events/event-types";

export type EventBus = {
  publish(event: DomainEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent = DomainEvent>(
    eventType: DomainEventType,
    handler: (event: TEvent) => void | Promise<void>
  ): EventUnsubscribe;
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

      await Promise.allSettled(handlerSnapshot.map((handler) => Promise.resolve().then(() => handler(event))));
    },

    subscribe<TEvent extends DomainEvent = DomainEvent>(
      eventType: DomainEventType,
      handler: (event: TEvent) => void | Promise<void>
    ) {
      const eventHandlers = handlers.get(eventType) ?? new Set<EventHandler>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventHandlers.add(handler as any);
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentHandlers.delete(handler as any);

        if (currentHandlers.size === 0) {
          handlers.delete(eventType);
        }
      };
    }
  };
}

export const eventBus = createEventBus();
