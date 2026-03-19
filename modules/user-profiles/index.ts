import { 
  type UpdateProfileInput, 
  type UpdateProfileResult 
} from "./contracts/update-profile";
export { type UserProfile } from "./domain/profile";
export { InitializationSource } from "./domain/initialization-source";

// Typed errors (for instanceof checks in app/)
export { ProfileNotFoundError, InvalidTimezoneError, NoProfileFieldsError } from "./errors";

// Services (only those needed by transport layer)
export { getCurrentProfile } from "./services/get-current-profile";
export { getOrCreateUserProfile, type GetOrCreateUserProfileInput } from "./services/get-or-create-user-profile";
export { updateUserProfile } from "./services/update-profile";
export { ensureProfileExists, type EnsureProfileExistsInput } from "./services/ensure-profile-exists";

export const userProfilesModule = {
  name: "user-profiles",
};

export type { UpdateProfileInput, UpdateProfileResult };
export type { UpdateProfileChanges } from "./contracts/update-profile";
