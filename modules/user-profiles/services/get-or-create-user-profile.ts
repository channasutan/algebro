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
  ProfileCreationError, 
  ProfileInvariantError 
} from "../errors";
import { logger, metrics, createServiceLogger, type ServiceContext } from "@/lib/observability";

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

  try {
    return await readProfileOrThrow(userRepo, userId);
  } catch (err) {
    if (!(err instanceof ProfileNotFoundError)) {
      throw err;
    }

    // Lazy bootstrap flow
    log.info("user-profiles.bootstrap", { 
      type: "domain", 
      userId, 
      phase: "insert", 
      source 
    });

    try {
      await bootstrapProfile(userId, email, source);
      
      // Post-bootstrap read with bounded retry for replication lag
      // Using taxonomy: read_after_insert
      const profile = await readWithRetry(userRepo, userId);
      
      log.info("user-profiles.bootstrap", { 
        type: "domain", 
        userId, 
        phase: "read_after_insert", 
        outcome: "success",
        durationMs: Date.now() - startTime,
        source 
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
        log.error("user-profiles.bootstrap", { 
          type: "domain", 
          userId, 
          phase: "insert", 
          outcome: "failure",
          durationMs: Date.now() - startTime,
          source 
        });
        
        // Normalize ONLY creation failures to external domain error
        throw new ProfileNotFoundError(userId);
      }
      
      // Allow ProfileInvariantError and infra errors to pass through
      throw bootstrapErr;
    }
  }
}

async function readProfileOrThrow(
  repo: ProfileRepository,
  userId: string
): Promise<UserProfile> {
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
  try {
    return await readProfileOrThrow(repo, userId);
  } catch (err) {
    if (!(err instanceof ProfileNotFoundError)) {
      throw err;
    }

    // Single bounded retry to account for standard read-after-write lag
    await new Promise(resolve => setTimeout(resolve, 10));
    return await readProfileOrThrow(repo, userId);
  }
}
