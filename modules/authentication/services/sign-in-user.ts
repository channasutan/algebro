import "server-only";

import type { SignInInput, SignInResult } from "../contracts/sign-in";
import type { AuthRepository } from "../repositories/supabase-auth-repository";

/**
 * Signs in an existing user with email and password.
 *
 * Delegates entirely to the repository. No domain event is emitted for
 * sign-in because no domain consumers currently require it.
 *
 * @param repository - Auth repository (injectable for testing)
 * @param input - Email and password credentials
 */
export async function signInUser(
  repository: AuthRepository,
  input: SignInInput
): Promise<SignInResult> {
  return repository.signIn(input);
}
