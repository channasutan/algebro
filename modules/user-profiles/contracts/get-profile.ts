import type { UserProfile } from "../domain/profile";

export type GetProfileInput = {
  userId: string;
};

export type GetProfileResult = {
  profile: UserProfile | null;
};
