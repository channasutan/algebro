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
  signUp(input: SignUpInput): Promise<SignUpResult & { userId: string | null; email: string | null }>;
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

function createRepositoryFromClientFactory(
  getClient: () => Promise<Awaited<ReturnType<typeof getSupabaseServerClient>>>
): AuthRepository {
  return {
    async signUp({ email, password }) {
      const client = await getClient();
      const { data, error } = await client.auth.signUp({ email, password });

      if (error) {
        throw new Error(error.message);
      }

      const userId = data.user?.id ?? null;
      const confirmedEmail = data.user?.email ?? null;
      const requiresEmailConfirmation =
        data.user?.identities?.length === 0 ||
        (data.user !== null && data.session === null);

      return { userId, email: confirmedEmail, requiresEmailConfirmation };
    },

    async signIn({ email, password }) {
      const client = await getClient();
      const { error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    },

    async signOut() {
      const client = await getClient();
      const { error } = await client.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }
    },

    async getSession(): Promise<SessionLookupResult> {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        return { session: null };
      }

      const session: AuthSession = {
        userId: data.session.user.id,
        email: data.session.user.email ?? "",
        isAuthenticated: true,
      };

      return { session };
    },

    async exchangeCodeForSession(code: string): Promise<void> {
      const client = await getClient();
      const { error } = await client.auth.exchangeCodeForSession(code);

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
