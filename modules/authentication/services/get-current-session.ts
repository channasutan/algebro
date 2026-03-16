import "server-only";

import type { SessionLookupResult } from "../contracts/session";
import type { AuthRepository } from "../repositories/supabase-auth-repository";

/**
 * Retrieves the current authenticated session from the request context.
 *
 * Returns `{ session: null }` when no valid session is found rather than
 * throwing, so callers can treat unauthenticated state as a normal case.
 *
 * @param repository - Auth repository (injectable for testing)
 */
export async function getCurrentSession(
  repository: AuthRepository
): Promise<SessionLookupResult> {
  return repository.getSession();
}
