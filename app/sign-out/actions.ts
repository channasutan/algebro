"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signOutUser } from "@/modules/authentication";
import { getPublicEnv } from "@/config/env.server-entry";
import { getRequestId, createServiceLogger } from "@/lib/observability";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signOutAction(): Promise<ActionResult> {
  await ensureModulesBootstrapped();

  const requestId = await getRequestId();
  const log = createServiceLogger(requestId);

  try {
    await signOutUser({ requestId });

    return { success: true };
  } catch (err) {
    const env = getPublicEnv();
    if (env.nodeEnv !== "production") {
      log.error({
        event: "user-profiles.auth",
        meta: { 
          type: "system", 
          phase: "infra", 
          outcome: "failure", 
          error: err instanceof Error ? err.message : String(err) 
        }
      });
    }
    return { success: false, error: "Sign out failed. Please try again" };
  }
}
