import { getPublicEnv as getServerPublicEnv, getServerEnv, getInfrastructureServerEnv, type PublicEnv, type ServerEnv, type InfrastructureServerEnv } from "./env.server";
import { getPublicEnv as getClientPublicEnv } from "./env.public";

export { type PublicEnv, type ServerEnv, type InfrastructureServerEnv };

export const env = getClientPublicEnv();

export function getPublicEnv(): PublicEnv {
  return getClientPublicEnv();
}

export function getServerEnv(): ServerEnv {
  return getServerPublicEnv();
}

export function getInfrastructureServerEnv(): InfrastructureServerEnv {
  return getInfrastructureServerEnv();
}
