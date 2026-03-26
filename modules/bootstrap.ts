import "server-only";

import { eventBus } from "@/events/event-bus";
import { AUTH_USER_REGISTERED } from "@/events/auth-events";
import { handleAuthUserRegistered } from "@/modules/user-profiles/events/on-auth-user-registered";
import { createServiceRoleProfileRepository } from "@/modules/user-profiles/repositories/supabase-profile-repository";

import {
  MATERIAL_PROCESSING_JOB,
  materialProcessingHandler
} from "@/jobs/handlers/material-processing";
import {
  POPULATE_POOL_JOB,
  populatePoolHandler,
  populatePoolPayloadSchema
} from "@/jobs/handlers/populate-pool";
import { registerJobHandler } from "@/jobs/job-runner";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function registerSharedInfrastructure(): void {
  registerJobHandler(MATERIAL_PROCESSING_JOB, materialProcessingHandler);
  registerJobHandler(POPULATE_POOL_JOB, {
    handler: populatePoolHandler,
    schema: populatePoolPayloadSchema
  });
}

function registerAuthenticationModule(): void {
  // Task 3 scaffolds the module boundary only. Auth subscribers arrive later.
}

function registerUserProfilesModule(): void {
  const profileRepo = createServiceRoleProfileRepository();

  eventBus.subscribe(
    AUTH_USER_REGISTERED,
    handleAuthUserRegistered(profileRepo)
  );
}

function registerOptionalJobs(): void {
  // Additional Phase 2 job wiring stays opt-in and can be appended here later.
}

/**
 * Register shared handlers and module-level bootstrap hooks exactly once.
 *
 * Call this from server entry points before invoking module services, such as:
 * Next.js route handlers, server actions, background job startup, and other
 * server-only integration boundaries.
 *
 * The registration order is deterministic so later Phase 2 tasks can layer in
 * auth and profile subscribers without duplicating side effects.
 */
export function ensureModulesBootstrapped(): Promise<void> {
  if (bootstrapped) {
    return Promise.resolve();
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    registerSharedInfrastructure();
    registerAuthenticationModule();
    registerUserProfilesModule();
    registerOptionalJobs();

    bootstrapped = true;
  })().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}
