import "server-only";

import type { AuthRepository } from "../repositories/supabase-auth-repository";

import { type ServiceContext } from "@/lib/observability";

/**
 * Completes the OAuth/magic-link auth callback by exchanging the one-time
 * code for a session. This is called from the `app/auth/callback/route.ts`
 * route handler after Supabase redirects back to the application.
 *
 * @param repository - Auth repository (injectable for testing)
 * @param code - The one-time auth code received from Supabase
 * @param context - Service context for correlation
 */
export async function handleAuthCallback(
  repository: AuthRepository,
  code: string,
  _context: ServiceContext
): Promise<void> {
  if (!code || code.trim().length === 0) {
    throw new Error("Auth callback code must be a non-empty string");
  }

  await repository.exchangeCodeForSession(code);
}
