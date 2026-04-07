import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";
import type { GetProfileInput } from "../contracts/get-profile";

export async function getCurrentProfile(
  repo: ProfileRepository,
  input: GetProfileInput
): Promise<UserProfile | null> {
  return await repo.findById(input.userId) ?? null;
}


