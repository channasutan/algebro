/**
 * Client-safe environment configuration entry point.
 *
 * This file can be safely imported in both client and server code.
 * Server-only functions (getServerEnv, getAuthEnv, getInfrastructureServerEnv, getSympyServiceUrl, getMayarApiBaseUrl, getFreeHintLimit)
 * are re-exported from env.server for server-side usage.
 * Client code should not call these functions as they require server-side environment access.
 */
import {
  getPublicAuthEnv as getClientPublicAuthEnv,
  getPublicEnv as getClientPublicEnv,
  hasPublicSupabaseEnv as hasClientPublicSupabaseEnv,
  type PublicAuthEnv,
  type PublicEnv
} from "./env.public";
export { type ServerEnv, type AuthEnv, type InfrastructureServerEnv } from "./env.server-entry";

export type { PublicEnv, PublicAuthEnv } from "./env.public";

// Re-export server-only functions for infrastructure usage
// These are safe to import in server-side code (infrastructure, API routes, etc.)
export {
  getPublicEnv,
  getAuthEnv,
  getInfrastructureServerEnv,
  getSympyServiceUrl,
  getMayarApiBaseUrl,
  getMayarApiKey,
  getMayarWebhookSecret,
  getFreeHintLimit
} from "./env.server-entry";

/**
 * Lazily resolve public env values so client-safe helpers can still answer
 * "is this configured?" checks without throwing during module import.
 */
export const env: PublicEnv = new Proxy({} as PublicEnv, {
  get(_target, property) {
    return Reflect.get(getClientPublicEnv(), property);
  },
  ownKeys() {
    return Reflect.ownKeys(getClientPublicEnv());
  },
  getOwnPropertyDescriptor(_target, property) {
    return {
      configurable: true,
      enumerable: true,
      value: Reflect.get(getClientPublicEnv(), property)
    };
  }
});

export function getPublicAuthEnv(): PublicAuthEnv {
  return getClientPublicAuthEnv();
}

export function hasPublicSupabaseEnv(): boolean {
  return hasClientPublicSupabaseEnv();
}
