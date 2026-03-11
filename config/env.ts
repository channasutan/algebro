type NodeEnv = "development" | "test" | "production";

type RawEnv = {
  nodeEnv: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  aiProviderApiKey?: string;
  mayarApiKey?: string;
  mayarWebhookSecret?: string;
};

type PublicEnv = {
  nodeEnv: NodeEnv;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type ServerEnv = PublicEnv;

type InfrastructureServerEnv = ServerEnv & {
  supabaseServiceRoleKey: string;
  aiProviderApiKey: string;
  mayarApiKey: string;
  mayarWebhookSecret: string;
};

const rawEnv: RawEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
  mayarApiKey: process.env.MAYAR_API_KEY,
  mayarWebhookSecret: process.env.MAYAR_WEBHOOK_SECRET
};

function readRequiredEnv(value: string | undefined, key: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function readNodeEnv(value: string): NodeEnv {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new Error(`Invalid NODE_ENV value: ${value}`);
}

export const env = rawEnv;

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
    supabaseServiceRoleKey: readRequiredEnv(rawEnv.supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
    aiProviderApiKey: readRequiredEnv(rawEnv.aiProviderApiKey, "AI_PROVIDER_API_KEY"),
    mayarApiKey: readRequiredEnv(rawEnv.mayarApiKey, "MAYAR_API_KEY"),
    mayarWebhookSecret: readRequiredEnv(rawEnv.mayarWebhookSecret, "MAYAR_WEBHOOK_SECRET")
  };
}
