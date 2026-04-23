"use server";

import { redirect } from "next/navigation";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signInUser } from "@/modules/authentication";
import { getPublicEnv } from "@/config/env.server-entry";
import { getRequestId, createServiceLogger } from "@/lib/observability";
import { signInSchema } from "@/lib/validations/sign-in";

export type SignInActionState = { error: string } | undefined;

export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData
): Promise<SignInActionState> {
  await ensureModulesBootstrapped();

  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  // Validate with Zod
  const validation = signInSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const { email, password } = validation.data;
  const requestId = await getRequestId();
  const log = createServiceLogger(requestId);

  try {
    await signInUser({ email, password }, { requestId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Map Supabase specific errors to user-friendly messages
    // "Invalid login credentials" is the common Supabase error for wrong email/password
    if (errorMessage.includes("Invalid login credentials")) {
      return { error: "Incorrect email or password. Please try again." };
    }

    const env = getPublicEnv();
    if (env.nodeEnv !== "production") {
      log.warn({
        event: "user-profiles.auth",
        meta: { 
          type: "system", 
          phase: "infra", 
          outcome: "failure", 
          error: errorMessage 
        }
      });
    }

    // Default user-safe error
    return { error: "An unexpected error occurred. Please try again later." };
  }

  // On success: redirect to /practice server-side
  redirect("/practice");
}
