export { type SignUpInput, type SignUpResult } from "./contracts/sign-up";
export { type SignInInput, type SignInResult } from "./contracts/sign-in";
export { type SessionLookupResult } from "./contracts/session";
export { type AuthSession } from "./domain/auth-session";

export { signUpUser } from "./services/sign-up-user";
export { signInUser } from "./services/sign-in-user";
export { signOutUser } from "./services/sign-out-user";
export { getCurrentSession } from "./services/get-current-session";
export { handleAuthCallback } from "./services/handle-auth-callback";
export { buildAuthRepository, createSupabaseAuthRepository, type AuthRepository } from "./repositories/supabase-auth-repository";

export const authenticationModule = {
  name: "authentication"
} as const;
