/**
 * Emitted by the authentication module after a user successfully completes
 * registration via Supabase Auth. Consumed by user-profiles to bootstrap
 * the profile row.
 */
import type { CoreDomainEventType, DomainEvent } from "@/events/event-types";
import { createDomainEvent } from "@/events/event-types";

export const AUTH_USER_REGISTERED = "auth_user_registered" as const satisfies CoreDomainEventType;

export type AuthUserRegisteredPayload = {
  userId: string;
  email: string;
  registeredAt: string;
  source: string;
};

export type AuthUserRegisteredEvent = DomainEvent<AuthUserRegisteredPayload>;

export function createAuthUserRegisteredEvent(
  payload: AuthUserRegisteredPayload
): AuthUserRegisteredEvent {
  return createDomainEvent({
    eventType: AUTH_USER_REGISTERED,
    payload
  });
}
