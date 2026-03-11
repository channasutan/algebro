export type PublicEnv = {
  nodeEnv: "development" | "test" | "production";
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function readRequiredPublicEnv(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }
  return value;
}

function readNodeEnv(value: string | undefined): "development" | "test" | "production" {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }
  return "development";
}

const publicEnv: PublicEnv = {
  nodeEnv: readNodeEnv(process.env.NODE_ENV),
  supabaseUrl: readRequiredPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readRequiredPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
};

export function getPublicEnv(): PublicEnv {
  return publicEnv;
}
