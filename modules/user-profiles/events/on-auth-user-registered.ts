import type { AuthUserRegisteredEvent } from "@/events/auth-events";
import type { EventHandler } from "@/events/event-types";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import { ensureProfileExists } from "../services/ensure-profile-exists";
import { createServiceLogger } from "@/lib/observability";

export function handleAuthUserRegistered(
  repo: ProfileRepository
): EventHandler {
  return async (event) => {
    const typedEvent = event as AuthUserRegisteredEvent;
    const requestId = typedEvent.event_id;
    const log = createServiceLogger(requestId);

    try {
      await ensureProfileExists(repo, {
        userId: typedEvent.payload.userId,
        email: typedEvent.payload.email,
        initializationSource: "auth_user_registered",
      });
    } catch (error) {
      log.error({
        event: "user-profiles.event_failure",
        meta: {
          type: "system",
          phase: "infra",
          userId: typedEvent.payload.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  };
}
