import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { POPULATE_POOL_JOB } from "../handlers/populate-pool";
import type { PopulatePoolPayload } from "../handlers/populate-pool";

/**
 * Enqueues a populate pool job to the database.
 * 
 * This function belongs in the jobs layer (not a module repository) because:
 * - It writes to the jobs table which is NOT owned by any module
 * - Per docs/development-rules.md: "Background processing lives inside /jobs"
 * - Per docs/development-rules.md: "repositories may only access tables owned by the module"
 */
export async function enqueuePopulatePoolJob(
  payload: PopulatePoolPayload
): Promise<string> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("jobs" as never)
    .insert(
      {
        type: POPULATE_POOL_JOB,
        payload,
        status: "pending",
        attempt_count: 0,
        max_attempts: 3,
      } as never
    )
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Failed to enqueue job", { cause: error });
  }

  return data.id;
}