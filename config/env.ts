/**
 * Client-safe environment configuration entry point.
 *
 * This file can be safely imported in both client and server code.
 * Server-only functions are available from env.server-entry for server-side usage.
 * Client code should not call server-only functions as they require server-side environment access.
 */
import {
  getPublicAuthEnv as getClientPublicAuthEnv,
  getPublicEnv as getClientPublicEnv,
  hasPublicSupabaseEnv as hasClientPublicSupabaseEnv,
  type PublicAuthEnv,
  type PublicEnv
} from "./env.public";

export type { PublicEnv, PublicAuthEnv } from "./env.public";

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
