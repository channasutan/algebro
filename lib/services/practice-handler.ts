import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/user";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseBody<T>(
  req: NextRequest,
  validate: (raw: unknown) => T | null
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }) };
  }
  const data = validate(body);
  if (data === null) {
    return { ok: false, response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }) };
  }
  return { ok: true, data };
}

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

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

export {
  createAttempt,
  submitStep,
  startSession,
  completeAttempt,
  DuplicateActiveSessionError,
} from "@/modules/practice";
