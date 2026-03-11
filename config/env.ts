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
