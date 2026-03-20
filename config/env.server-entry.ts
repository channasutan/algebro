/**
 * Server-only environment configuration entry point.
 *
 * Infrastructure adapters and server-side code should import from this file.
 * This file is protected by the "server-only" package and cannot be imported in client code.
 *
 * @example
 * // In infrastructure adapters:
 * import { getAiProviderApiKey } from "@/config/env.server-entry";
 */
import "server-only";
export { type PublicEnv, type PublicAuthEnv, type ServerEnv, type AuthEnv, type InfrastructureServerEnv } from "./env.server";
export {
  getPublicEnv,
  getAuthEnv,
  getServerEnv,
  getInfrastructureServerEnv,
  getSupabaseServiceRoleKey,
  getAiProviderApiKey,
  getMayarApiKey,
  getMayarWebhookSecret,
  getMayarApiBaseUrl,
  getSympyServiceUrl,
  getLoggerStrict
} from "./env.server";
