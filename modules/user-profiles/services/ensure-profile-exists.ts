import { eventBus } from "@/events/event-bus";
import { createUserProfileInitializedEvent } from "../events/profile-initialized";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";

export type EnsureProfileExistsInput = {
  userId: string;
  email: string;
  initializationSource?: string;
};

export async function ensureProfileExists(
  repo: ProfileRepository,
  input: EnsureProfileExistsInput
): Promise<UserProfile> {
  const { userId, email } = input;

  if (!email || email.trim() === "") {
    throw new Error("[user-profiles] Cannot create profile without email");
  }

  // Check if profile already exists
  const existing = await repo.findById(userId);
  if (existing) {
    return existing;
  }

  // insertProfile returns a UserProfile or throws on failure
  const profile = await repo.insertProfile({
    id: userId,
    email,
    timezone: "UTC",
  });

  // Explicit null check - throw if insert returned null (e.g., race condition)
  if (!profile) {
    throw new Error("[user-profiles] failed to create or load profile");
  }

  // Emit event after profile is ensured (may be new or existing)
  const event = createUserProfileInitializedEvent({
    userId,
    email,
    displayName: null,
    initializedAt: new Date().toISOString(),
    initializationSource: input.initializationSource ?? "lazy_bootstrap",
  });
  void eventBus.publish(event).catch((err) => {
    console.error("[user-profiles] failed to publish event", err);
  });

  return profile;
}
