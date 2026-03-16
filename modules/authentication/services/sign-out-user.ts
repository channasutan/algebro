import "server-only";

import type { AuthRepository } from "../repositories/supabase-auth-repository";

/**
 * Signs out the currently authenticated user.
 *
 * Delegates to the repository to invalidate the session cookie.
 * No domain event is emitted for sign-out in the baseline Phase 2 slice.
 *
 * @param repository - Auth repository (injectable for testing)
 */
export async function signOutUser(repository: AuthRepository): Promise<void> {
  await repository.signOut();
}
