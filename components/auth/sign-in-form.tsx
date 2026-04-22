"use client";

import { AuthForm } from "@/app/(auth)/components/AuthForm";
import { signInAction } from "@/app/sign-in/actions";

export function SignInForm() {
  return (
    <AuthForm
      title="Sign In"
      submitLabel="Sign In"
      pendingLabel="Signing in..."
      action={signInAction}
      successMessage="Sign in successful!"
    />
  );
}
