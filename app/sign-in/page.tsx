import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/authentication";
import { SignInPage } from "@/components/auth/sign-in-page";
import { signInAction } from "./actions";

export default async function Page() {
  const { session } = await getCurrentSession();
  
  if (session) {
    redirect("/practice");
  }

  return <SignInPage action={signInAction} />;
}
