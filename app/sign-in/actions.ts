"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signInUser } from "@/modules/authentication";
import { getPublicEnv } from "@/config/env.server-entry";
import { getRequestId, createServiceLogger } from "@/lib/observability";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signInAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  await ensureModulesBootstrapped();

  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return { success: false, error: "Invalid input" };
  }

  const email = emailRaw.trim().toLowerCase();
  const password = passwordRaw.trim();

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const requestId = await getRequestId();
  const log = createServiceLogger(requestId);
  try {
    await signInUser({ email, password }, { requestId });

    return { success: true };
  } catch (err) {
    // Return deterministic error for all authentication failures to prevent leaking info
    const env = getPublicEnv();
    if (env.nodeEnv !== "production") {
      log.warn({
        event: "user-profiles.auth",
        meta: { type: "system", phase: "infra", outcome: "failure", error: err instanceof Error ? err.message : String(err) }
      });
    }
    return { success: false, error: "Invalid email or password" };
  }
}
