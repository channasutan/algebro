import "server-only";

import type { SignInInput, SignInResult } from "../contracts/sign-in";
import type { AuthRepository } from "../repositories/supabase-auth-repository";

/**
 * Signs in an existing user with email and password.
 *
 * Delegates entirely to the repository. No domain event is emitted for
 * sign-in because no domain consumers currently require it.
 *
 * @param input - Email and password credentials
 * @param repository - Auth repository (injectable for testing)
 */
export async function signInUser(
  input: SignInInput,
  repository: AuthRepository
): Promise<SignInResult> {
  return repository.signIn(input);
}
