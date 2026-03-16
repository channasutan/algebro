import { eventBus } from "@/events/event-bus";
import { createUserProfileUpdatedEvent } from "../events/profile-updated";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UpdateProfileInput, UpdateProfileResult } from "../contracts/update-profile";
import { ensureProfileExists } from "./ensure-profile-exists";

function validateTimezone(timezone: string | undefined): void {
  if (timezone === undefined) {
    return;
  }

  let supported: string[] | undefined;

  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      supported = Intl.supportedValuesOf("timeZone");
    } catch {
      supported = undefined;
    }
  }

  if (supported) {
    if (!supported.includes(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    return;
  }

  // Fallback to safe IANA timezone regex validation
  const IANA_REGEX = /^[A-Za-z_]+(?:\/[A-Za-z0-9._+-]+)+$/;
  if (!IANA_REGEX.test(timezone)) {
    throw new Error(`Invalid timezone format: ${timezone}`);
  }
}

export async function updateProfile(
  repo: ProfileRepository,
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  const { userId, changes } = input;

  validateTimezone(changes.timezone);

  // Guarantee row exists before updating, to prevent silent failures
  await ensureProfileExists(repo, { userId });

  const updatedProfile = await repo.updateProfile(userId, changes);

  const changedFields: Record<string, string | null> = {};
  if (changes.displayName !== undefined) {
    changedFields.display_name = changes.displayName;
  }
  if (changes.avatarUrl !== undefined) {
    changedFields.avatar_url = changes.avatarUrl;
  }
  if (changes.timezone !== undefined) {
    changedFields.timezone = changes.timezone;
  }

  if (Object.keys(changedFields).length > 0) {
    const event = createUserProfileUpdatedEvent({
      userId,
      changedFields,
      updatedAt: updatedProfile.updatedAt,
    });

    void eventBus.publish(event).catch((err) => {
      console.error("[user-profiles] failed to publish event", err);
    });
  }

  return { profile: updatedProfile };
}
