import type { DomainEvent, EventHandler, EventUnsubscribe } from "@/events/event-types";

class InMemoryEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    const registeredHandlers = this.handlers.get(event.type);

    if (!registeredHandlers || registeredHandlers.size === 0) {
      return;
    }

    await Promise.all(Array.from(registeredHandlers, (handler) => handler(event)));
  }

  subscribe(eventType: string, handler: EventHandler): EventUnsubscribe {
    const handlers = this.handlers.get(eventType) ?? new Set<EventHandler>();

    handlers.add(handler);
    this.handlers.set(eventType, handlers);

    return () => {
      const currentHandlers = this.handlers.get(eventType);

      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler);

      if (currentHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }
}

export const eventBus = new InMemoryEventBus();
