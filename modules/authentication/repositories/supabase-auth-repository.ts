import "server-only";

import {
  getSupabaseServerClient,
  buildSupabaseServerClient,
} from "@/lib/supabase/server-client";

import type { SignUpInput, SignUpResult } from "../contracts/sign-up";
import type { SignInInput, SignInResult } from "../contracts/sign-in";
import type { SessionLookupResult } from "../contracts/session";
import type { AuthSession } from "../domain/auth-session";

/**
 * Authentication repository.
 *
 * This is the ONLY file in the authentication module allowed to import
 * `lib/supabase/*`. Services must call repository functions and must not
 * access Supabase clients directly.
 *
 * Uses the request-scoped server client for session reads and writes so that
 * Supabase Auth session cookies are maintained per request and RLS applies.
 */

export type AuthRepository = {
  signUp(input: SignUpInput): Promise<SignUpResult & { email: string | null }>;
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(): Promise<void>;
  getSession(): Promise<SessionLookupResult>;
  exchangeCodeForSession(code: string): Promise<void>;
};

/**
 * Creates an auth repository that uses a custom cookie store.
 * Used in tests to inject a controlled environment.
 */
export function buildAuthRepository(
  cookieStore: Awaited<ReturnType<typeof import("next/headers").cookies>>
): AuthRepository {
  const getClient = async () => buildSupabaseServerClient(cookieStore);
  return createRepositoryFromClientFactory(getClient);
}

/**
 * Creates the default runtime auth repository.
 * Obtains a new request-scoped Supabase server client on each operation.
 */
export function createSupabaseAuthRepository(): AuthRepository {
  const getClient = () => getSupabaseServerClient();
  return createRepositoryFromClientFactory(getClient);
}

function extractUserId(user: AuthUser | null | undefined): string | null {
  return user?.id ?? null;
}

function extractConfirmedEmail(user: AuthUser | null | undefined): string | null {
  return user?.email ?? null;
}

/**
 * Determines whether the user needs to confirm their email.
 *
 * Conditions requiring confirmation:
 * 1. No identities found (user created but not fully provisioned)
 * 2. User exists but no session created (email confirmation pending)
 *
 * If user is null/undefined, returns false - there's no user to require confirmation.
 */
function determineRequiresEmailConfirmation(
  user: AuthUser | null | undefined,
  session: Session | null | undefined
): boolean {
  // No user exists - nothing to confirm
  if (user == null) {
    return false;
  }

  const hasNoIdentities = (user.identities?.length ?? 0) === 0;
  const hasUserButNoSession = session === null;

  return hasNoIdentities || hasUserButNoSession;
}

interface AuthUser {
  id: string;
  email: string | null;
  identities?: Array<unknown>;
}

interface Session {
  access_token: string;
}

interface SignUpResponse {
  user: AuthUser | null;
  session: Session | null;
}

function createRepositoryFromClientFactory(
  getClient: () => Promise<Awaited<ReturnType<typeof getSupabaseServerClient>>>
): AuthRepository {
  return {
    async signUp({ email, password }) {
      const client = await getClient();
      const { data, error } = await client.auth.signUp({ email, password });

      if (error) {
        throw new Error(error.message, { cause: error });
      }

      const response = data as SignUpResponse;
      const userId = extractUserId(response.user);
      const email_ = extractConfirmedEmail(response.user);
      const requiresEmailConfirmation = determineRequiresEmailConfirmation(
        response.user,
        response.session
      );

      return { userId, email: email_, requiresEmailConfirmation };
    },

    async signIn({ email, password }) {
      const client = await getClient();
      const { error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error(error.message, { cause: error });
      }

      return { success: true };
    },

    async signOut() {
      const client = await getClient();
      const { error } = await client.auth.signOut();

      if (error) {
        throw new Error(error.message, { cause: error });
      }
    },

    async getSession(): Promise<SessionLookupResult> {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw new Error(error.message, { cause: error });
      }

      if (!data.session) {
        return { session: null };
      }

      // An authenticated session must have a valid email.
      // If email is missing, treat as unauthenticated.
      if (!data.session.user.email) {
        return { session: null };
      }

      const session: AuthSession = {
        userId: data.session.user.id,
        email: data.session.user.email,
        isAuthenticated: true,
      };

      return { session };
    },

    async exchangeCodeForSession(code: string): Promise<void> {
      const client = await getClient();
      const { error } = await client.auth.exchangeCodeForSession(code);

      if (error) {
        throw new Error(error.message, { cause: error });
      }
    },
  };
}
