/**
 * Server-side environment configuration implementation.
 *
 * This file contains the actual implementation of environment variable access
 * for server-side code. It is protected by the "server-only" package.
 *
 * Server code should import from @/config/env.server-entry instead of this file directly.
 */
import "server-only";

import {
  getPublicAuthEnv as getClientSafePublicAuthEnv,
  getPublicEnv as getClientSafePublicEnv,
  type PublicAuthEnv,
  type PublicEnv
} from "./env.public";
export type { PublicEnv, PublicAuthEnv } from "./env.public";

type NodeEnv = PublicEnv["nodeEnv"];

type RawServerEnv = {
  nodeEnv: string;
  supabaseServiceRoleKey?: string;
  aiProviderApiKey?: string;
  mayarApiKey?: string;
  mayarWebhookSecret?: string;
  mayarApiBaseUrl?: string;
  sympyServiceUrl?: string;
};

function getRawServerEnv(): RawServerEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
    mayarApiKey: process.env.MAYAR_API_KEY,
    mayarWebhookSecret: process.env.MAYAR_WEBHOOK_SECRET,
    mayarApiBaseUrl: process.env.MAYAR_API_BASE_URL,
    sympyServiceUrl: process.env.SYMPY_SERVICE_URL
  };
}

function readRequiredEnv(value: string | undefined, key: string, description?: string): string {
  if (!value || value.trim().length === 0) {
    const message = description
      ? `Missing required environment variable: ${key} (${description})`
      : `Missing required environment variable: ${key}`;
    throw new Error(message);
  }

  return value;
}

function readNodeEnv(value: string): NodeEnv {
  const allowedValues = ["development", "test", "production"];
  if (allowedValues.includes(value)) {
    return value as NodeEnv;
  }

  throw new Error(
    `Invalid NODE_ENV value: "${value}". Allowed values are: ${allowedValues.join(", ")}`
  );
}

export type ServerEnv = PublicEnv;
export type AuthEnv = PublicEnv & PublicAuthEnv;

export type InfrastructureServerEnv = ServerEnv & {
  supabaseServiceRoleKey: string;
  aiProviderApiKey: string;
  mayarApiKey: string;
  mayarWebhookSecret: string;
  mayarApiBaseUrl: string;
  sympyServiceUrl: string;
};

export function getPublicEnv(): PublicEnv {
  return getPublicEnvFromClientSafeConfig();
}

export function getServerEnv(): ServerEnv {
  return getPublicEnvFromClientSafeConfig();
}

export function getAuthEnv(): AuthEnv {
  return {
    ...getPublicEnvFromClientSafeConfig(),
    ...getClientSafePublicAuthEnv()
  };
}

export function getInfrastructureServerEnv(): InfrastructureServerEnv {
  return {
    ...getPublicEnvFromClientSafeConfig(),
    supabaseServiceRoleKey: getSupabaseServiceRoleKey(),
    aiProviderApiKey: getAiProviderApiKey(),
    mayarApiKey: getMayarApiKey(),
    mayarWebhookSecret: getMayarWebhookSecret(),
    mayarApiBaseUrl: getMayarApiBaseUrl(),
    sympyServiceUrl: getSympyServiceUrl()
  };
}

export function getSupabaseServiceRoleKey(): string {
  const rawEnv = getRawServerEnv();

  return readRequiredEnv(
    rawEnv.supabaseServiceRoleKey,
    "SUPABASE_SERVICE_ROLE_KEY",
    "required for admin database access"
  );
}

export function getAiProviderApiKey(): string {
  const rawEnv = getRawServerEnv();

  return readRequiredEnv(
    rawEnv.aiProviderApiKey,
    "AI_PROVIDER_API_KEY",
    "required for AI service"
  );
}

export function getMayarApiKey(): string {
  const rawEnv = getRawServerEnv();

  return readRequiredEnv(
    rawEnv.mayarApiKey,
    "MAYAR_API_KEY",
    "required for payment service"
  );
}

export function getMayarWebhookSecret(): string {
  const rawEnv = getRawServerEnv();

  return readRequiredEnv(
    rawEnv.mayarWebhookSecret,
    "MAYAR_WEBHOOK_SECRET",
    "required for payment webhooks"
  );
}

export function getMayarApiBaseUrl(): string {
  const rawEnv = getRawServerEnv();

  return rawEnv.mayarApiBaseUrl ?? "https://api.mayar.id";
}

export function getSympyServiceUrl(): string {
  const rawEnv = getRawServerEnv();

  return rawEnv.sympyServiceUrl ?? "http://127.0.0.1:8000";
}

function getPublicEnvFromClientSafeConfig(): PublicEnv {
  const publicEnv = getClientSafePublicEnv();

  return {
    ...publicEnv,
    nodeEnv: readNodeEnv(publicEnv.nodeEnv)
  };
}
