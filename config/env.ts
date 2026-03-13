/**
 * Client-safe environment configuration entry point.
 *
 * This file can be safely imported in both client and server code.
 * Server-only functions (getServerEnv, getInfrastructureServerEnv) throw errors
 * when called from client context.
 *
 * For server-side code that needs infrastructure secrets, import from @/config/env.server-entry instead.
 */
import { getPublicEnv as getClientPublicEnv, type PublicEnv } from "./env.client";
export { type ServerEnv, type InfrastructureServerEnv } from "./env.server-entry";

export type { PublicEnv } from "./env.client";

export const env = getClientPublicEnv();

export function getPublicEnv(): PublicEnv {
  return getClientPublicEnv();
}

export function getServerEnv() {
  throw new Error("getServerEnv() must be called from server context");
}

export function getInfrastructureServerEnv() {
  throw new Error("getInfrastructureServerEnv() must be called from server context");
}
