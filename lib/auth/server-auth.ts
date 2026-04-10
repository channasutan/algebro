import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getUser } from "@/lib/auth/user";
import { ServiceContext } from "@/lib/observability";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(supabase: ReturnType<typeof getSupabaseServerClient>): Promise<AuthResult> {
  const user = await getUser(supabase);

  if (!user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    };
  }

  return { ok: true, userId: user.id };
}

export function buildContext(): ServiceContext {
  return { requestId: crypto.randomUUID() };
}