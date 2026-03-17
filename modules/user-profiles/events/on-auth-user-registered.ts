import type { AuthUserRegisteredEvent } from "@/modules/authentication/events/auth-user-registered";
import type { EventHandler } from "@/events/event-types";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import { ensureProfileExists } from "../services/ensure-profile-exists";

export function handleAuthUserRegistered(
  repo: ProfileRepository
): EventHandler {
  return async (event) => {
    const typedEvent = event as AuthUserRegisteredEvent;
    try {
      await ensureProfileExists(repo, {
        userId: typedEvent.payload.userId,
        email: typedEvent.payload.email,
        initializationSource: "auth_user_registered",
      });
    } catch (error) {
      console.error("[user-profiles] failed to bootstrap profile", error);
    }
  };
}
