import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";
import { ensureProfileExists } from "./ensure-profile-exists";
import type { GetProfileInput } from "../contracts/get-profile";

export async function getCurrentProfile(
  repo: ProfileRepository,
  input: GetProfileInput
): Promise<UserProfile> {
  const profile = await repo.findById(input.userId);

  if (profile) {
    return profile;
  }

  return ensureProfileExists(repo, { userId: input.userId });
}
