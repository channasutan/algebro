import { eventBus } from "@/events/event-bus";
import { createUserProfileInitializedEvent } from "../events/profile-initialized";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";

export type EnsureProfileExistsInput = {
  userId: string;
  email: string;
};

export async function ensureProfileExists(
  repo: ProfileRepository,
  input: EnsureProfileExistsInput
): Promise<UserProfile> {
  const { userId, email } = input;

  if (!email || email.trim() === "") {
    throw new Error("[user-profiles] Cannot create profile without email");
  }

  const existing = await repo.findById(userId);
  if (existing) {
    return existing;
  }

  const inserted = await repo.insertProfile({
    id: userId,
    email,
    timezone: "UTC",
  });

  const profile = await repo.requireById(userId);

  if (inserted) {
    const event = createUserProfileInitializedEvent({
      userId,
      email,
      displayName: null,
      initializedAt: new Date().toISOString(),
      initializationSource: "lazy_bootstrap",
    });
    void eventBus.publish(event).catch((err) => {
      console.error("[user-profiles] failed to publish event", err);
    });
  }

  return profile;
}
