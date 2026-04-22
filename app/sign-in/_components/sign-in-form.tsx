// app/sign-in/_components/sign-in-form.tsx
// Server Component — no "use client" needed here.
// AuthForm is a Client Component and will define the client boundary.

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
