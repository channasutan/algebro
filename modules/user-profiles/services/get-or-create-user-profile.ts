import { 
  createSupabaseProfileRepository, 
  createServiceRoleProfileRepository,
  type ProfileRepository
} from "../repositories/supabase-profile-repository";
import type { UserProfile } from "../domain/profile";
import { InitializationSource } from "../domain/initialization-source";
import { getCurrentProfile } from "./get-current-profile";
import { ensureProfileExists } from "./ensure-profile-exists";
import { 
  ProfileNotFoundError, 
  ProfileCreationError
} from "../errors";
import { metrics, createServiceLogger, type ServiceContext } from "@/lib/observability";

export type GetOrCreateUserProfileInput = {
  userId: string;
  email: string;
  source: InitializationSource;
};

/**
 * Orchestrates user profile retrieval with automatic lazy initialization.
 * High-level entry point with explicit correlation and orchestration logging.
 */
export async function getOrCreateUserProfile(
  input: GetOrCreateUserProfileInput,
  context: ServiceContext
): Promise<UserProfile> {
  const { userId, email, source } = input;
  const { requestId } = context;
  const startTime = Date.now();
  const log = createServiceLogger(requestId);
  const userRepo = createSupabaseProfileRepository();

  const existingProfile = await readProfile(userRepo, userId);
  if (existingProfile) {
    return existingProfile;
  }

  // Lazy bootstrap flow
  log.info({
    event: "user-profiles.bootstrap",
    meta: {
      type: "domain",
      userId,
      phase: "insert",
      source
    }
  });

  try {
    await bootstrapProfile(userId, email, source);

    // Post-bootstrap read with bounded retry for replication lag
    // Using taxonomy: read_after_insert
    const profile = await readWithRetry(userRepo, userId);

    log.info({
      event: "user-profiles.bootstrap",
      meta: {
        type: "domain",
        userId,
        phase: "read_after_insert",
        outcome: "success",
        durationMs: Date.now() - startTime,
        source
      }
    });
    return profile;
  } catch (bootstrapErr) {
    if (bootstrapErr instanceof ProfileCreationError) {
      // Log final failure after all retries
      metrics.increment("profile_bootstrap_failure_total", requestId, {
        source,
        cause: "replication_lag_limit",
        phase: "retry"
      });
      log.error({
        event: "user-profiles.bootstrap",
        meta: {
          type: "domain",
          userId,
          phase: "insert",
          outcome: "failure",
          durationMs: Date.now() - startTime,
          source
        }
      });

      // Normalize ONLY creation failures to external domain error
      throw new ProfileNotFoundError(userId);
    }

    // Allow ProfileInvariantError and infra errors to pass through
    throw bootstrapErr;
  }
}

async function readProfile(
  repo: ProfileRepository,
  userId: string
): Promise<UserProfile | null> {
  return await getCurrentProfile(repo, { userId });
}

async function bootstrapProfile(
  userId: string,
  email: string,
  source: InitializationSource
): Promise<void> {
  const serviceRepo = createServiceRoleProfileRepository();
  await ensureProfileExists(serviceRepo, {
    userId,
    email,
    initializationSource: source,
  });
}

/**
 * Bounded read retry for eventual consistency.
 * PURE helper unaware of observability details.
 */
async function readWithRetry(
  repo: ProfileRepository,
  userId: string
): Promise<UserProfile> {
  const profile = await readProfile(repo, userId);
  if (profile) return profile;

  // Single bounded retry to account for standard read-after-write lag
  await new Promise(resolve => setTimeout(resolve, 10));
  const retriedProfile = await readProfile(repo, userId);
  if (!retriedProfile) throw new ProfileNotFoundError(userId);
  return retriedProfile;
}
