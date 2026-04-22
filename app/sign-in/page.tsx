import { SignInPage } from "@/components/auth/sign-in-page";
import { signInAction } from "./actions";

const initialState = { success: false, error: "" } as const;

export default function Page() {
  return <SignInPage action={signInAction} initialState={initialState} />;
}
