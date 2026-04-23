import { SignInPage } from "@/components/auth/sign-in-page";
import { signInAction } from "./actions";

export default function Page() {
  return <SignInPage action={signInAction} />;
}
