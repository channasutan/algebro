export type PublicEnv = {
  nodeEnv: "development" | "test" | "production";
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function readRequiredPublicEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }
  return value;
}

const publicEnv: PublicEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: readRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
};

export function getPublicEnv(): PublicEnv {
  return publicEnv;
}
