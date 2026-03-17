import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";
import type { GetProfileInput } from "../contracts/get-profile";

export async function getCurrentProfile(
  repo: ProfileRepository,
  input: GetProfileInput
): Promise<UserProfile> {
  const profile = await repo.findById(input.userId);

  if (profile) {
    return profile;
  }

  // Lazy bootstrap is NOT allowed without email
  // Caller must provide email when creating new profiles
  throw new Error("[user-profiles] Profile not found. Email is required to create a new profile.");
}
