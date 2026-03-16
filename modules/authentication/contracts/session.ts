import type { AuthSession } from "../domain/auth-session";

export type SessionLookupResult = {
  session: AuthSession | null;
};
