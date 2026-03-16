import type { UserProfile } from "../domain/profile";

export type UpdateProfileChanges = {
  displayName?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
};

export type UpdateProfileInput = {
  userId: string;
  changes: UpdateProfileChanges;
};

export type UpdateProfileResult = {
  profile: UserProfile;
};
