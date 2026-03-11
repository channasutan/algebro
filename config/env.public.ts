export type PublicEnv = {
  nodeEnv: "development" | "test" | "production";
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const publicEnv: PublicEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export function getPublicEnv(): PublicEnv {
  return publicEnv;
}
