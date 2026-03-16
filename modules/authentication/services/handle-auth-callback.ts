import "server-only";

import type { AuthRepository } from "../repositories/supabase-auth-repository";

/**
 * Completes the OAuth/magic-link auth callback by exchanging the one-time
 * code for a session. This is called from the `app/auth/callback/route.ts`
 * route handler after Supabase redirects back to the application.
 *
 * @param code - The one-time auth code received from Supabase
 * @param repository - Auth repository (injectable for testing)
 */
export async function handleAuthCallback(
  code: string,
  repository: AuthRepository
): Promise<void> {
  if (!code || code.trim().length === 0) {
    throw new Error("Auth callback code must be a non-empty string");
  }

  await repository.exchangeCodeForSession(code);
}
