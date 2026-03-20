import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";
import type { GetProfileInput } from "../contracts/get-profile";
import { ProfileNotFoundError } from "../errors";

export async function getCurrentProfile(
  repo: ProfileRepository,
  input: GetProfileInput
): Promise<UserProfile> {
  const profile = await repo.findById(input.userId);

  if (profile) {
    return profile;
  }

  // ProfileNotFoundError is expected in lazy bootstrap scenarios.
  // It is treated as recoverable — not data corruption.
  throw new ProfileNotFoundError(input.userId);
}


