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

  throw new Error("[user-profiles] Profile not found. Create profile via ensureProfileExists.");
}
