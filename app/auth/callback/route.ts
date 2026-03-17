import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { handleAuthCallback } from "@/modules/authentication";

function getSafeRedirectPath(nextParam: string | null): string {
  if (!nextParam) return "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(nextParam);
  } catch {
    return "/";
  }

  // Must start with single "/" and not be "//" or absolute URL
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.match(/^[a-zA-Z]+:/)) {
    return "/";
  }

  return decoded;
}

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
    // Safely decode and validate the redirect path
    redirectUrl = getSafeRedirectPath(next);
  } catch {
    redirectUrl = "/sign-in?error=auth_failed";
  }

  redirect(redirectUrl);
}
