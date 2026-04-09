import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getUser } from "@/lib/auth/user";
import { ServiceContext } from "@/lib/observability";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const supabase = getSupabaseServerClient();
  const user = await getUser(supabase);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return { ok: true, userId: user.id };
}

export function buildContext(): ServiceContext {
  return { requestId: crypto.randomUUID() };
}