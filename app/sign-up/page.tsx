import { AuthForm } from "../(auth)/components/AuthForm";
import { signUpAction } from "./actions";

export default function SignUpPage() {
  return (
    <AuthForm
      title="Sign Up"
      submitLabel="Sign Up"
      pendingLabel="Signing up..."
      action={signUpAction}
      successMessage="Sign up successful! Please check your email to confirm your account."
    />
  );
}
