/**
 * Emitted by the user-profiles module after a successful profile update.
 * changedFields is a record of the mutated field names mapped to their new
 * values, giving consumers enough context to react without re-fetching the
 * full profile.
 */
import type { CoreDomainEventType, DomainEvent } from "@/events/event-types";
import { createDomainEvent } from "@/events/event-types";

export const USER_PROFILE_UPDATED = "user_profile_updated" as const satisfies CoreDomainEventType;

type ProfileFieldValue = string | number | boolean | null;

/**
 * Profile fields that can appear in a profile update event.
 * These keys must remain synchronized with the mutable columns
 * of the public.users profile table defined in the database schema.
 * When a migration adds a new mutable profile column, update this
 * union accordingly.
 */
type ProfileField = "display_name" | "avatar_url" | "bio" | "timezone";

/** Contains only the fields that were modified during the profile update. */
type ProfileFieldMap = Partial<Record<ProfileField, ProfileFieldValue>>;

export type UserProfileUpdatedPayload = {
  userId: string;
  /** Maps each modified field name to its new value after the profile update. */
  readonly changedFields: Readonly<ProfileFieldMap>;
  updatedAt: string;
};

export type UserProfileUpdatedEvent = DomainEvent<UserProfileUpdatedPayload>;

export function createUserProfileUpdatedEvent(
  payload: UserProfileUpdatedPayload
): UserProfileUpdatedEvent {
  return createDomainEvent({
    eventType: USER_PROFILE_UPDATED,
    payload
  });
}
