/**
 * Emitted by the authentication module after a user successfully completes
 * registration via Supabase Auth. Consumed by user-profiles to bootstrap
 * the profile row.
 */
import { createDomainEvent } from "@/events/event-types";
import { type AuthUserRegisteredEvent, type AuthUserRegisteredPayload, AUTH_USER_REGISTERED } from "@/events/auth-events";

export { type AuthUserRegisteredEvent, type AuthUserRegisteredPayload, AUTH_USER_REGISTERED };

export function createAuthUserRegisteredEvent(
  payload: AuthUserRegisteredPayload
): AuthUserRegisteredEvent {
  return createDomainEvent({
    eventType: AUTH_USER_REGISTERED,
    payload
  });
}
