import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware - ROOT boundary for request identification.
 * Injects x-request-id for downstream lifecycle correlation.
 */
export function middleware(_request: NextRequest) {
  const requestId = crypto.randomUUID();

  // 1. Inject correlation header for RSC and Server Actions
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
