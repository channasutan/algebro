import { eventBus } from "@/events/event-bus";
import { createUserProfileInitializedEvent } from "../events/profile-initialized";
import { ProfileNotFoundError, ProfileCreationError, ProfileInvariantError } from "../errors";
import { type ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";
import { logger } from "@/lib/observability";

export type EnsureProfileExistsInput = {
  userId: string;
  email: string;
  initializationSource?: string;
};

/**
 * Pure behavioral helper to ensure a profile exists in the repository.
 * Observability (logging/metrics) is owned by the calling service.
 */
export async function ensureProfileExists(
  repo: ProfileRepository,
  input: EnsureProfileExistsInput
): Promise<UserProfile> {
  const { userId, email } = input;
  const startTime = Date.now();

  if (!email || email.trim() === "") {
    throw new Error("[user-profiles] Cannot create profile without email");
  }

  try {
    // 1. Check if profile already exists
    const existing = await repo.findById(userId);
    if (existing) {
      return existing;
    }

    // 2. Attempt to insert profile
    const profile = await repo.insertProfile({
      id: userId,
      email,
      timezone: "UTC",
    });

    if (!profile) {
      logger.error({
        event: "user-profiles.ensure",
        meta: { 
          type: "domain", 
          userId, 
          phase: "insert", 
          outcome: "failure",
          durationMs: Date.now() - startTime,
          reason: "repository_returned_null" 
        }
      });
      throw new ProfileCreationError(userId, "Repository returned null after creation attempt");
    }

    // 3. Invariant Enforcement: Validate data integrity returned from repository
    if (profile.userId !== userId) {
      logger.error({
        event: "user-profiles.ensure",
        meta: { 
          type: "domain", 
          userId, 
          phase: "insert", 
          outcome: "failure",
          durationMs: Date.now() - startTime,
          returnedUserId: profile.userId 
        }
      });
      throw new ProfileInvariantError(userId, `profile ID mismatch (expected ${userId}, got ${profile.userId})`);
    }

    // 4. Emit initialization event
    const event = createUserProfileInitializedEvent({
      userId,
      email,
      displayName: null,
      initializedAt: new Date().toISOString(),
      initializationSource: input.initializationSource ?? "lazy_bootstrap",
    });
    
    // Fire and forget - caught internally to avoid blocking the request
    void eventBus.publish(event).catch(() => {});

    return profile;
  } catch (error) {
    // 5. Infra Error Logging (Preserving Original Error)
    // Only log if it's not a domain error we already logged
    const isDomainError = error instanceof ProfileCreationError || error instanceof ProfileInvariantError;

    if (!isDomainError) {
      logger.error({
        event: "user-profiles.ensure",
        meta: { 
          type: "domain",
          userId, 
          phase: "infra",
          outcome: "failure",
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error) 
        }
      });
    }
    throw error;
  }
}
