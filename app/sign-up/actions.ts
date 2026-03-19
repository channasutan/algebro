"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signUpUser } from "@/modules/authentication";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function signUpAction(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
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

  try {
    await signUpUser({ email, password });

    return { success: true };
  } catch {
    // DO NOT leak internal error content or use fragile string matching
    console.warn("[auth] unexpected error in signUpAction");
    return { success: false, error: "Sign up failed. Please try again." };
  }
}
