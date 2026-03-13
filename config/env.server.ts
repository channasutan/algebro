/**
 * Server-side environment configuration implementation.
 *
 * This file contains the actual implementation of environment variable access
 * for server-side code. It is protected by the "server-only" package.
 *
 * Server code should import from @/config/env.server-entry instead of this file directly.
 */
import "server-only";

import type { PublicEnv } from "./env.public";
export type { PublicEnv } from "./env.public";

type NodeEnv = PublicEnv["nodeEnv"];

type RawServerEnv = {
  nodeEnv: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  aiProviderApiKey?: string;
  mayarApiKey?: string;
  mayarWebhookSecret?: string;
};

const rawEnv: RawServerEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
  mayarApiKey: process.env.MAYAR_API_KEY,
  mayarWebhookSecret: process.env.MAYAR_WEBHOOK_SECRET
};

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

export type InfrastructureServerEnv = ServerEnv & {
  supabaseServiceRoleKey: string;
  aiProviderApiKey: string;
  mayarApiKey: string;
  mayarWebhookSecret: string;
};

export function getPublicEnv(): PublicEnv {
  return {
    nodeEnv: readNodeEnv(rawEnv.nodeEnv),
    supabaseUrl: readRequiredEnv(rawEnv.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readRequiredEnv(rawEnv.supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export function getServerEnv(): ServerEnv {
  return getPublicEnv();
}

export function getInfrastructureServerEnv(): InfrastructureServerEnv {
  return {
    ...getPublicEnv(),
    supabaseServiceRoleKey: getSupabaseServiceRoleKey(),
    aiProviderApiKey: getAiProviderApiKey(),
    mayarApiKey: getMayarApiKey(),
    mayarWebhookSecret: getMayarWebhookSecret()
  };
}

export function getSupabaseServiceRoleKey(): string {
  return readRequiredEnv(
    rawEnv.supabaseServiceRoleKey,
    "SUPABASE_SERVICE_ROLE_KEY",
    "required for admin database access"
  );
}

export function getAiProviderApiKey(): string {
  return readRequiredEnv(
    rawEnv.aiProviderApiKey,
    "AI_PROVIDER_API_KEY",
    "required for AI service"
  );
}

export function getMayarApiKey(): string {
  return readRequiredEnv(
    rawEnv.mayarApiKey,
    "MAYAR_API_KEY",
    "required for payment service"
  );
}

export function getMayarWebhookSecret(): string {
  return readRequiredEnv(
    rawEnv.mayarWebhookSecret,
    "MAYAR_WEBHOOK_SECRET",
    "required for payment webhooks"
  );
}
