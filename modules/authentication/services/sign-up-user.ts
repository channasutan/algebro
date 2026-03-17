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
 * Event publishing is best-effort: if the event bus fails, the error is logged
 * but does not affect the sign-up result. This ensures user registration
 * succeeds even if event subscribers are temporarily unavailable.
 *
 * @param repository - Auth repository (injectable for testing)
 * @param input - Email and password for the new account
 */
export async function signUpUser(
  repository: AuthRepository,
  input: SignUpInput
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

    // Best-effort event publishing - do not crash the service if event bus fails.
    try {
      await eventBus.publish(event);
    } catch (publishError) {
      // Log the error but do not throw - user registration must succeed.
      console.error(
        `[authentication] Failed to publish auth_user_registered event for user ${result.userId}:`,
        publishError
      );
    }
  }

  return {
    userId: result.userId,
    requiresEmailConfirmation: result.requiresEmailConfirmation,
  };
}
