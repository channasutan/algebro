/**
 * Client-safe environment configuration entry point.
 *
 * This file can be safely imported in both client and server code.
 * Server-only functions (getServerEnv, getAuthEnv, getInfrastructureServerEnv) are intentionally stubbed in this client-safe entry point and will always throw if called.
 * Server code must import the real implementations from "@/config/env.server-entry".
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

export function getPublicEnv(): PublicEnv {
  return getClientPublicEnv();
}

export function getPublicAuthEnv(): PublicAuthEnv {
  return getClientPublicAuthEnv();
}

export function hasPublicSupabaseEnv(): boolean {
  return hasClientPublicSupabaseEnv();
}

export function getServerEnv() {
  throw new Error("getServerEnv() must be called from server context");
}

export function getAuthEnv() {
  throw new Error("getAuthEnv() must be called from server context");
}

export function getInfrastructureServerEnv() {
  throw new Error("getInfrastructureServerEnv() must be called from server context");
}
