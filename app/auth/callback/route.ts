import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { handleAuthCallback } from "@/modules/authentication";

export async function GET(request: NextRequest) {
  await ensureModulesBootstrapped();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    redirect("/sign-in?error=invalid_callback");
  }

  let redirectUrl = "/";
  try {
    await handleAuthCallback(code);
    // Validate next is a safe relative path to avoid open redirect vulnerabilities
    const decodedNext = decodeURIComponent(next);
    // Must start with single "/" and not be "//" or absolute URL
    const isSafeRedirectPath =
      decodedNext.startsWith("/") &&
      !decodedNext.startsWith("//") &&
      !decodedNext.match(/^[a-zA-Z]+:/);

    if (isSafeRedirectPath) {
      redirectUrl = decodedNext;
    }
  } catch {
    redirectUrl = "/sign-in?error=auth_failed";
  }

  redirect(redirectUrl);
}
