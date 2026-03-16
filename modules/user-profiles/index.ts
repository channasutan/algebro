export { type GetProfileInput, type GetProfileResult } from "./contracts/get-profile";
export {
  type UpdateProfileChanges,
  type UpdateProfileInput,
  type UpdateProfileResult
} from "./contracts/update-profile";
export { type UserProfile } from "./domain/profile";

export const userProfilesModule = {
  name: "user-profiles"
} as const;
