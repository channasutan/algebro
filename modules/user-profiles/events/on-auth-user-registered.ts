import type { AuthUserRegisteredEvent } from "@/modules/authentication/events/auth-user-registered";
import type { EventHandler } from "@/events/event-types";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import { ensureProfileExists } from "../services/ensure-profile-exists";
import { InitializationSource } from "../domain/initialization-source";
import { logger, createServiceLogger } from "@/lib/observability";

export function handleAuthUserRegistered(
  repo: ProfileRepository
): EventHandler {
  return async (event) => {
    const typedEvent = event as AuthUserRegisteredEvent;
    const requestId = "system";
    const log = createServiceLogger(requestId);

    try {
      await ensureProfileExists(repo, {
        userId: typedEvent.payload.userId,
        email: typedEvent.payload.email,
        initializationSource: "auth_user_registered",
      });
    } catch (error) {
      log.error("profile.asyncBootstrap.failed", {
        userId: event.payload.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
