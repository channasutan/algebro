import { signUpUser as internalSignUpUser } from "./services/sign-up-user";
import { signInUser as internalSignInUser } from "./services/sign-in-user";
import { signOutUser as internalSignOutUser } from "./services/sign-out-user";
import { getCurrentSession as internalGetCurrentSession } from "./services/get-current-session";
import { handleAuthCallback as internalHandleAuthCallback } from "./services/handle-auth-callback";
import { createSupabaseAuthRepository } from "./repositories/supabase-auth-repository";

import type { SignUpInput, SignUpResult } from "./contracts/sign-up";
import type { SignInInput, SignInResult } from "./contracts/sign-in";
import type { SessionLookupResult } from "./contracts/session";

export { type SignUpInput, type SignUpResult } from "./contracts/sign-up";
export { type SignInInput, type SignInResult } from "./contracts/sign-in";
export { type SessionLookupResult } from "./contracts/session";
export { type AuthSession } from "./domain/auth-session";
export { type AuthRepository } from "./repositories/supabase-auth-repository";

export async function signUpUser(input: SignUpInput): Promise<SignUpResult> {
  const repo = createSupabaseAuthRepository();
  return internalSignUpUser(repo, input);
}

export async function signInUser(input: SignInInput): Promise<SignInResult> {
  const repo = createSupabaseAuthRepository();
  return internalSignInUser(repo, input);
}

export async function signOutUser(): Promise<void> {
  const repo = createSupabaseAuthRepository();
  return internalSignOutUser(repo);
}

export async function getCurrentSession(): Promise<SessionLookupResult> {
  const repo = createSupabaseAuthRepository();
  return internalGetCurrentSession(repo);
}

export async function handleAuthCallback(code: string): Promise<void> {
  const repo = createSupabaseAuthRepository();
  return internalHandleAuthCallback(repo, code);
}

export const authenticationModule = {
  name: "authentication",
} as const;
