"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signOutUser } from "@/modules/authentication";
import { getPublicEnv } from "@/config/env.server-entry";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signOutAction(): Promise<ActionResult> {
  await ensureModulesBootstrapped();

  try {
    await signOutUser();

    return { success: true };
  } catch {
    const env = getPublicEnv();
    if (env.nodeEnv !== "production") {
      console.warn("[auth] unexpected error in signOutAction");
    }
    return { success: false, error: "Sign out failed. Please try again" };
  }
}
