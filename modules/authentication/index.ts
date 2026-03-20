import { signUpUser as internalSignUpUser } from "./services/sign-up-user";
import { signInUser as internalSignInUser } from "./services/sign-in-user";
import { signOutUser as internalSignOutUser } from "./services/sign-out-user";
import { getCurrentSession as internalGetCurrentSession } from "./services/get-current-session";
import { handleAuthCallback as internalHandleAuthCallback } from "./services/handle-auth-callback";
import { createSupabaseAuthRepository } from "./repositories/supabase-auth-repository";
import { type ServiceContext } from "@/lib/observability";

import type { SignUpInput, SignUpResult } from "./contracts/sign-up";
import type { SignInInput, SignInResult } from "./contracts/sign-in";
import type { SessionLookupResult } from "./contracts/session";

export { type SignUpInput, type SignUpResult } from "./contracts/sign-up";
export { type SignInInput, type SignInResult } from "./contracts/sign-in";
export { type SessionLookupResult } from "./contracts/session";
export { type AuthSession } from "./domain/auth-session";

export async function signUpUser(input: SignUpInput, context: ServiceContext): Promise<SignUpResult> {
  const repo = createSupabaseAuthRepository();
  return internalSignUpUser(repo, input, context);
}

export async function signInUser(input: SignInInput, context: ServiceContext): Promise<SignInResult> {
  const repo = createSupabaseAuthRepository();
  return internalSignInUser(repo, input, context);
}

export async function signOutUser(context: ServiceContext): Promise<void> {
  const repo = createSupabaseAuthRepository();
  return internalSignOutUser(repo, context);
}

export async function getCurrentSession(): Promise<SessionLookupResult> {
  const repo = createSupabaseAuthRepository();
  return internalGetCurrentSession(repo);
}

export async function handleAuthCallback(code: string, context: ServiceContext): Promise<void> {
  const repo = createSupabaseAuthRepository();
  return internalHandleAuthCallback(repo, code, context);
}

export const authenticationModule = {
  name: "authentication",
} as const;
