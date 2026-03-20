import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { handleAuthCallback } from "@/modules/authentication";
import { getRequestId, createServiceLogger } from "@/lib/observability";

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

  const requestId = await getRequestId();
  const log = createServiceLogger(requestId);

  // Handle auth callback - unsafe next still processes auth but redirects to safe path
  try {
    await handleAuthCallback(code, { requestId });
  } catch (error) {
    log.error({
      event: "user-profiles.auth",
      meta: {
        type: "system",
        phase: "infra",
        outcome: "failure",
        error: error instanceof Error ? error.message : String(error)
      }
    });
    redirectUrl = "/sign-in?error=auth_failed";
  }

  redirect(redirectUrl);
}
