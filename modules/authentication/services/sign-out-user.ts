import "server-only";

import type { AuthRepository } from "../repositories/supabase-auth-repository";

import { type ServiceContext } from "@/lib/observability";

/**
 * Signs out the currently authenticated user.
 *
 * Delegates to the repository to invalidate the session cookie.
 * No domain event is emitted for sign-out in the baseline Phase 2 slice.
 *
 * @param repository - Auth repository (injectable for testing)
 * @param context - Service context for correlation
 */
export async function signOutUser(
  repository: AuthRepository,
  _context: ServiceContext
): Promise<void> {
  await repository.signOut();
}
