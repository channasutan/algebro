export { type SignUpInput, type SignUpResult } from "./contracts/sign-up";
export { type SignInInput, type SignInResult } from "./contracts/sign-in";
export { type SessionLookupResult } from "./contracts/session";
export { type AuthSession } from "./domain/auth-session";

export const authenticationModule = {
  name: "authentication"
} as const;
