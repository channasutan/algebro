import { eventBus } from "@/events/event-bus";
import { createUserProfileUpdatedEvent } from "../events/profile-updated";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UpdateProfileInput, UpdateProfileResult, UpdateProfileChanges } from "../contracts/update-profile";
import type { ProfileFieldMap } from "../domain/profile";

function getSupportedTimezones(): string[] | undefined {
  if (typeof Intl === "undefined" || typeof Intl.supportedValuesOf !== "function") {
    return undefined;
  }

  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return undefined;
  }
}

function validateWithIntl(timezone: string, supported: string[]): void {
  if (!supported.includes(timezone)) {
    throw new Error(`[user-profiles] Invalid timezone: ${timezone}`);
  }
}

function validateWithRegex(timezone: string): void {
  const IANA_REGEX = /^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9._+-]+)+)$/;
  if (!IANA_REGEX.test(timezone)) {
    throw new Error(`[user-profiles] Invalid timezone format: ${timezone}`);
  }
}

function validateTimezone(timezone: string | undefined): void {
  if (timezone === undefined) {
    return;
  }

  const supported = getSupportedTimezones();

  if (supported) {
    validateWithIntl(timezone, supported);
    return;
  }

  validateWithRegex(timezone);
}

function buildChangedFields(changes: UpdateProfileChanges): ProfileFieldMap {
  const changedFields: ProfileFieldMap = {
    displayName: null,
    avatarUrl: null,
    timezone: "" as string,
  };

  if (changes.displayName !== undefined) {
    changedFields.displayName = changes.displayName;
  }
  if (changes.avatarUrl !== undefined) {
    changedFields.avatarUrl = changes.avatarUrl;
  }
  if (changes.timezone !== undefined) {
    changedFields.timezone = changes.timezone;
  }

  return changedFields;
}

function publishProfileUpdatedEvent(
  userId: string,
  changedFields: ProfileFieldMap,
  updatedAt: string
): void {
  // Convert to record for event payload
  const payload: Record<string, string | null> = {};
  if (changedFields.displayName !== null) {
    payload.display_name = changedFields.displayName;
  }
  if (changedFields.avatarUrl !== null) {
    payload.avatar_url = changedFields.avatarUrl;
  }
  if (changedFields.timezone) {
    payload.timezone = changedFields.timezone;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const event = createUserProfileUpdatedEvent({
    userId,
    changedFields: payload,
    updatedAt,
  });

  void eventBus.publish(event).catch((err) => {
    console.error("[user-profiles] failed to publish event", err);
  });
}

export async function updateProfile(
  repo: ProfileRepository,
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  const { userId, changes } = input;

  // Normalize changes - filter out undefined values
  const normalizedChanges = Object.fromEntries(
    Object.entries(changes).filter(([, v]) => v !== undefined)
  ) as UpdateProfileChanges;

  // Prevent empty update operations
  if (Object.keys(normalizedChanges).length === 0) {
    throw new Error("[user-profiles] No profile fields provided for update");
  }

  validateTimezone(normalizedChanges.timezone);

  // Verify profile exists before updating
  const existingProfile = await repo.findById(userId);
  if (!existingProfile) {
    throw new Error("[user-profiles] Profile not found. Cannot update non-existent profile.");
  }

  const updatedProfile = await repo.updateProfile(userId, normalizedChanges);

  const changedFields = buildChangedFields(normalizedChanges);
  publishProfileUpdatedEvent(userId, changedFields, updatedProfile.updatedAt);

  return { profile: updatedProfile };
}
