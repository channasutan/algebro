import { SignInPage } from "@/components/auth/sign-in-page";
import { signInAction } from "./actions";
import type { AuthActionResult } from "@/modules/authentication/contracts";

const initialState: AuthActionResult = { success: false, error: "" };

export default function Page() {
  return <SignInPage action={signInAction} initialState={initialState} />;
}
