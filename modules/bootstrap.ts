import "server-only";

import {
  MATERIAL_PROCESSING_JOB,
  materialProcessingHandler
} from "@/jobs/handlers/material-processing";
import { registerJobHandler } from "@/jobs/job-runner";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function registerSharedInfrastructure(): void {
  registerJobHandler(MATERIAL_PROCESSING_JOB, materialProcessingHandler);
}

function registerAuthenticationModule(): void {
  // Task 3 scaffolds the module boundary only. Auth subscribers arrive later.
}

function registerUserProfilesModule(): void {
  // Task 3 scaffolds the module boundary only. Profile subscribers arrive later.
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
