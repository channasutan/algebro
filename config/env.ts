import { 
  getPublicEnv as getServerPublicEnv, 
  getServerEnv as getServerEnvInternal, 
  getInfrastructureServerEnv as getInfrastructureServerEnvInternal, 
  type PublicEnv, 
  type ServerEnv, 
  type InfrastructureServerEnv 
} from "./env.server";
import { getPublicEnv as getClientPublicEnv } from "./env.public";

export { type PublicEnv, type ServerEnv, type InfrastructureServerEnv };

export const env = getClientPublicEnv();

export function getPublicEnv(): PublicEnv {
  return getClientPublicEnv();
}

export function getServerEnv(): ServerEnv {
  return getServerEnvInternal();
}

export function getInfrastructureServerEnv(): InfrastructureServerEnv {
  return getInfrastructureServerEnvInternal();
}
