import { eventBus } from "@/events/event-bus";
import { AUTH_USER_REGISTERED } from "@/events/auth-events";
import { handleAuthUserRegistered } from "@/modules/user-profiles/events/on-auth-user-registered";
import { createServiceRoleProfileRepository } from "@/modules/user-profiles/repositories/supabase-profile-repository";
import { ATTEMPT_COMPLETED } from "@/events/attempt-events";
import { handleAttemptCompleted } from "@/modules/curriculum/events/on-attempt-completed";
import { createServiceRoleCurriculumRepository } from "@/modules/curriculum/repositories/supabase-curriculum-repository";
import { createSupabasePracticeRepository } from "@/repositories/practice/supabase-practice-repository";
import {
  MATERIAL_UPLOADED,
  MATERIAL_PROCESSED,
} from "@/events/material-events";
import type {
  MaterialUploadedPayload,
  MaterialProcessedPayload,
} from "@/events/material-events";

export function registerUserProfilesEventHandlers(): void {
  const profileRepo = createServiceRoleProfileRepository();

  eventBus.subscribe(
    AUTH_USER_REGISTERED,
    handleAuthUserRegistered(profileRepo)
  );
}

export function registerCurriculumEventHandlers(): void {
  const curriculumRepo = createServiceRoleCurriculumRepository();
  const practiceRepo = createSupabasePracticeRepository();
  eventBus.subscribe(ATTEMPT_COMPLETED, handleAttemptCompleted(curriculumRepo, practiceRepo));
}

export function registerMaterialProcessingEventHandlers(): void {
  eventBus.subscribe(MATERIAL_UPLOADED, async (event) => {
    try {
      const payload = event.payload as MaterialUploadedPayload;
      // Job is already enqueued inside uploadMaterial() service.
      // This subscriber only logs out-of-band events; it does not enqueue processing.
      console.info('[bootstrap] material_uploaded received, material_id:', payload.material_id);
    } catch (err) {
      console.error('[bootstrap] material_uploaded handler failed:', err);
    }
  });

  eventBus.subscribe(MATERIAL_PROCESSED, async (event) => {
    try {
      const payload = event.payload as MaterialProcessedPayload;
      // Curriculum wiring will be added in a follow-up once processMaterial() is implemented.
      console.info('[bootstrap] material_processed received, topics:', payload.topics);
    } catch (err) {
      console.error('[bootstrap] material_processed handler failed:', err);
    }
  });
}