import { eventBus } from "@/events/event-bus";
import { createUserProfileUpdatedEvent } from "../events/profile-updated";
import { getPublicEnv } from "@/config/env.server-entry";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UpdateProfileInput, UpdateProfileResult, UpdateProfileChanges } from "../contracts/update-profile";
import type { ProfileFieldMap } from "../domain/profile";
import { ProfileNotFoundError, InvalidTimezoneError, NoProfileFieldsError } from "../errors";
import { createSupabaseProfileRepository } from "../repositories/supabase-profile-repository";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

function getSupportedTimezones(): string[] | undefined {
  if (typeof Intl === "undefined" || typeof Intl.supportedValuesOf !== "function") {
    return undefined;
  }

  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    const env = getPublicEnv();
    if (env.nodeEnv !== "production") {
      console.warn("[user-profiles] Intl.supportedValuesOf not available, using regex validation");
    }
    return undefined;
  }
}

function validateWithIntl(timezone: string, supported: string[]): void {
  if (!supported.includes(timezone)) {
    throw new InvalidTimezoneError(timezone);
  }
}

function validateWithRegex(timezone: string): void {
  const IANA_REGEX = /^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9._+-]+)+)$/;
  if (!IANA_REGEX.test(timezone)) {
    throw new InvalidTimezoneError(timezone);
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

function buildEventPayload(changedFields: ProfileFieldMap): Record<string, string | null> {
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

  return payload;
}

function publishProfileUpdatedEvent(
  userId: string,
  changedFields: ProfileFieldMap,
  updatedAt: string
): void {
  const payload = buildEventPayload(changedFields);

  if (Object.keys(payload).length === 0) {
    return;
  }

  const event = createUserProfileUpdatedEvent({
    userId,
    changedFields: payload,
    updatedAt,
  });

  void eventBus.publish(event).catch(() => {
    // Internal helper is pure. Observability for async failures is handled at the service boundary 
    // or via aggregate health checks.
  });
}

/**
 * Updates a user profile.
 * High-level orchestration and observability entry point.
 */
export async function updateUserProfile(
  input: UpdateProfileInput,
  context: ServiceContext
): Promise<UpdateProfileResult> {
  const { userId, changes } = input;
  const { requestId } = context;
  const log = createServiceLogger(requestId);

  log.info({ 
    event: "user-profiles.update", 
    meta: { type: "domain", phase: "start", userId, changes: Object.keys(changes) } 
  });

  try {
    const repo = createSupabaseProfileRepository();
    const result = await updateUserProfileWithRepository(repo, input);

    log.info({ 
      event: "user-profiles.update", 
      meta: { type: "domain", phase: "complete", userId, outcome: "success" } 
    });
    return result;
  } catch (err) {
    if (err instanceof NoProfileFieldsError) {
      log.warn({ 
        event: "user-profiles.update", 
        meta: { type: "domain", phase: "validation", userId, outcome: "failure", reason: "empty_update" } 
      });
    } else if (err instanceof ProfileNotFoundError) {
      log.error({ 
        event: "user-profiles.update", 
        meta: { type: "domain", phase: "infra", userId, outcome: "failure", reason: "not_found" } 
      });
    } else {
      log.error({ 
        event: "user-profiles.update", 
        meta: { 
          type: "domain", 
          phase: "infra",
          userId, 
          outcome: "failure",
          error: err instanceof Error ? err.message : String(err) 
        }
      });
    }
    throw err;
  }
}

/**
 * Core implementation for profile updates.
 * PURE helper unaware of observability.
 */
export async function updateUserProfileWithRepository(
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
    throw new NoProfileFieldsError();
  }

  validateTimezone(normalizedChanges.timezone);

  // Verify profile exists before updating
  const existingProfile = await repo.findById(userId);
  if (!existingProfile) {
    throw new ProfileNotFoundError(userId);
  }

  const updatedProfile = await repo.updateProfile(userId, normalizedChanges);

  const changedFields = buildChangedFields(normalizedChanges);
  publishProfileUpdatedEvent(userId, changedFields, updatedProfile.updatedAt);

  return { profile: updatedProfile };
}

export const updateProfile = updateUserProfileWithRepository;
