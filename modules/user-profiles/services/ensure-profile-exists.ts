import { eventBus } from "@/events/event-bus";
import { createUserProfileInitializedEvent } from "../events/user-profile-initialized";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";

export type EnsureProfileExistsInput = {
  userId: string;
  email?: string | null;
};

export async function ensureProfileExists(
  repo: ProfileRepository,
  input: EnsureProfileExistsInput
): Promise<UserProfile> {
  const { userId, email } = input;

  const existing = await repo.findById(userId);
  if (existing) {
    return existing;
  }

  const inserted = await repo.insertProfile({
    id: userId,
    email: email ?? null,
    timezone: "UTC",
  });

  const profile = await repo.requireById(userId);

  if (inserted) {
    const event = createUserProfileInitializedEvent({ userId });
    void eventBus.publish(event).catch((err) => {
      console.error("[user-profiles] failed to publish event", err);
    });
  }

  return profile;
}
