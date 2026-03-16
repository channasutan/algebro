import "server-only";

import { eventBus } from "@/events/event-bus";
import { createAuthUserRegisteredEvent } from "@/modules/authentication/events/auth-user-registered";

import type { SignUpInput, SignUpResult } from "../contracts/sign-up";
import type { AuthRepository } from "../repositories/supabase-auth-repository";

/**
 * Signs up a new user with email and password.
 *
 * Publishes `auth_user_registered` only after Supabase confirms user creation.
 * Failed or invalid sign-up attempts must not emit the event.
 *
 * @param input - Email and password for the new account
 * @param repository - Auth repository (injectable for testing)
 */
export async function signUpUser(
  input: SignUpInput,
  repository: AuthRepository
): Promise<SignUpResult> {
  const result = await repository.signUp(input);

  // Emit only when Supabase returned a user id — confirming the account was created.
  if (result.userId !== null) {
    const event = createAuthUserRegisteredEvent({
      userId: result.userId,
      email: result.email ?? input.email,
      registeredAt: new Date().toISOString(),
      source: "email",
    });

    await eventBus.publish(event);
  }

  return {
    userId: result.userId,
    requiresEmailConfirmation: result.requiresEmailConfirmation,
  };
}
