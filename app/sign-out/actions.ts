"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signOutUser } from "@/modules/authentication";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signOutAction(): Promise<ActionResult> {
  await ensureModulesBootstrapped();

  try {
    await signOutUser();

    return { success: true };
  } catch (error) {
    console.warn("[auth] unexpected error in signOutAction");
    return { success: false, error: "Failed to sign out" };
  }
}
