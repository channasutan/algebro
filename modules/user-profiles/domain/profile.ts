export type UserProfile = {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  updatedAt: string;
};

/**
 * Maps service-layer field names to database column names.
 * Used for building event payloads and DB update objects.
 */
export type ProfileFieldMap = {
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
};
