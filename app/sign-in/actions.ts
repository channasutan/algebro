"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signInUser } from "@/modules/authentication";

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

  try {
    await signInUser({ email, password });

    return { success: true };
  } catch {
    // Return deterministic error for all authentication failures to prevent leaking info
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] unexpected error in signInAction");
    }
    return { success: false, error: "Invalid email or password" };
  }
}
