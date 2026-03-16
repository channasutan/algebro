import type { CoreDomainEventType, DomainEvent } from "@/events/event-types";
import { createDomainEvent } from "@/events/event-types";

export const USER_PROFILE_INITIALIZED = "user_profile_initialized" as const satisfies CoreDomainEventType;

export type UserProfileInitializedPayload = {
  userId: string;
};

export type UserProfileInitializedEvent = DomainEvent<UserProfileInitializedPayload>;

export function createUserProfileInitializedEvent(
  payload: UserProfileInitializedPayload
): UserProfileInitializedEvent {
  return createDomainEvent({
    eventType: USER_PROFILE_INITIALIZED,
    payload
  });
}
