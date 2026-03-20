import { eventBus } from "@/events/event-bus";
import { createUserProfileInitializedEvent } from "../events/profile-initialized";
import { ProfileCreationError } from "../errors";
import { type ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";

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

  if (!email || email.trim() === "") {
    throw new Error("[user-profiles] Cannot create profile without email");
  }

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
    throw new ProfileCreationError(userId, "Repository returned null after creation attempt");
  }

  // 3. Emit initialization event
  const event = createUserProfileInitializedEvent({
    userId,
    email,
    displayName: null,
    initializedAt: new Date().toISOString(),
    initializationSource: input.initializationSource ?? "lazy_bootstrap",
  });
  
  // Fire and forget
  void eventBus.publish(event).catch(() => {});

  return profile;
}
