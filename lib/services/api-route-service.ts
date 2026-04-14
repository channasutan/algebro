/**
 * Route-layer facade — the ONLY lib/* path that app/ API routes are allowed to import from.
 * All route utilities and service delegates must be accessed through this file.
 */
export { parseBody, type ParseResult } from "@/lib/api-helpers";
export { requireAuth, type AuthResult } from "@/lib/auth/server-auth-facade";
export { handleMayarWebhook, type MayarWebhookData } from "@/lib/services/billing-service";
