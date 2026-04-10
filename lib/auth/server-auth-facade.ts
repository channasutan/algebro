import { requireAuth, buildContext } from "./server-auth";

export type AuthResult = ReturnType<typeof requireAuth> extends Promise<infer T> ? T : never;

export async function requireAuth(supabase: Parameters<typeof requireAuth>[0]): Promise<AuthResult> {
  return requireAuth(supabase);
}

export function buildContext(): ReturnType<typeof buildContext> {
  return buildContext();
}