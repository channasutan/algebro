import type {
  DomainEvent,
  DomainEventType,
  EventHandler,
  EventUnsubscribe
} from "@/events/event-types";

/**
 * StrictEventHandler ties a handler to a specific DomainEventType.
 * This provides compile-time safety that handlers subscribe to expected event types.
 *
 * @example
 * StrictEventHandler<"attempt_completed"> ensures the handler receives
 * a DomainEvent with event_type "attempt_completed"
 */
export type StrictEventHandler<TEventType extends DomainEventType> = (
  event: DomainEvent & { event_type: TEventType }
) => void | Promise<void>;

export type EventBus = {
  publish(event: DomainEvent): Promise<void>;
  subscribe<TEventType extends DomainEventType>(
    eventType: TEventType,
    handler: EventHandler
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
