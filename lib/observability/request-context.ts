import { headers } from "next/headers";

/**
 * Resolves the unique request identifier from the x-request-id header.
 * 
 * INVARIANT: This must ONLY be called at the entry layer (Page, Layout, or Server Action).
 * INVARIANT: Sub-layers (Services, Repositories) must receive the ID via ServiceContext.
 */
export async function getRequestId(): Promise<string> {
  try {
    // In Next.js 16+, headers() is async and must be awaited.
    const h = await headers();
    const requestId = h.get("x-request-id");
    
    if (!requestId) {
      // Log to stderr visually for developers if header is missing in a request context
      process.stderr.write(`[observability-warning] Missing x-request-id header in request flow\n`);
      return "unknown";
    }

    return requestId;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    // Fallback for non-HTTP contexts (e.g. build time, edge cases)
    return "system";
  }
}
