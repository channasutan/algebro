import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { handleAuthCallback } from "@/modules/authentication";

/**
 * Validates that a redirect path is safe (relative, not absolute).
 * Returns true if the path:
 * - Starts with a single "/"
 * - Is not protocol-relative (not "//")
 * - Does not contain backslashes
 * - Does not contain control characters
 * - Is not an absolute URL
 */
function isSafeRelativePath(path: string): boolean {
  const isRelative = path.startsWith("/");
  const isProtocolRelative = path.startsWith("//");
  const hasProtocol = /^[a-zA-Z]+:/.exec(path) !== null;
  const hasBackslash = path.includes("\\");
  const hasControlChars = [...path].some((char) => char.charCodeAt(0) <= 31);

  return isRelative && !isProtocolRelative && !hasProtocol && !hasBackslash && !hasControlChars;
}

function getSafeRedirectPath(nextParam: string | null): string {
  if (!nextParam) return "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(nextParam);
  } catch {
    return "/";
  }

  if (!isSafeRelativePath(decoded)) {
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

  // ALWAYS compute safe redirect path FIRST
  const safeNext = getSafeRedirectPath(next);

  // Initialize redirect URL to safeNext (will be "/" for unsafe next values)
  let redirectUrl = safeNext;

  // Handle auth callback - unsafe next still processes auth but redirects to safe path
  try {
    await handleAuthCallback(code);
  } catch {
    redirectUrl = "/sign-in?error=auth_failed";
  }

  redirect(redirectUrl);
}
