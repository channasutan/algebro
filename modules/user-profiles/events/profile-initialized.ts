/**
 * Emitted by the user-profiles module the first time a profile row is created
 * for a user, whether triggered by the auth_user_registered event or the
 * lazy fallback path inside getCurrentProfile.
 */
import type { CoreDomainEventType, DomainEvent } from "@/events/event-types";
import { createDomainEvent } from "@/events/event-types";

export const USER_PROFILE_INITIALIZED = "user_profile_initialized" as const satisfies CoreDomainEventType;

export type UserProfileInitializedPayload = {
  userId: string;
  email: string;
  displayName: string | null;
  initializedAt: string;
  initializationSource: string;
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
