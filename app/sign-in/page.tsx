import { AuthForm } from "../(auth)/components/AuthForm";
import { signInAction } from "./actions";

export default function SignInPage() {
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
