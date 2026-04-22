"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signInUser } from "@/modules/authentication";
import { getPublicEnv } from "@/config/env.server-entry";
import { getRequestId, createServiceLogger } from "@/lib/observability";
import { redirect } from "next/navigation";
import type { AuthActionResult } from "@/modules/authentication/contracts";

export async function signInAction(_prevState: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  await ensureModulesBootstrapped();

  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return { success: false, error: "Invalid input" };
  }

  const email = emailRaw.trim().toLowerCase();
  const password = passwordRaw; // Never trim passwords

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const requestId = await getRequestId();
  const log = createServiceLogger(requestId);
  try {
    await signInUser({ email, password }, { requestId });
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

  // Redirect after mutation per Next.js best practices
  redirect("/dashboard");
}
