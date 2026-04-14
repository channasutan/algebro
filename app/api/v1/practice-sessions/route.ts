import { NextRequest, NextResponse } from "next/server";
import { startSession, DuplicateActiveSessionError } from "@/modules/practice";
import { parseBody, type ParseResult } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth/server-auth-facade";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isOptionalString(v: unknown): v is string | null | undefined {
  return v === null || v === undefined || typeof v === "string";
}

type StartSessionInput = {
  topicId?: string | null;
};

function validateStartSessionInput(raw: unknown): StartSessionInput | null {
  if (!isPlainObject(raw)) return null;
  if (!("topicId" in raw)) return null;
  const { topicId } = raw as { topicId?: unknown };
  if (!isOptionalString(topicId)) return null;
  return { topicId };
}

async function handleStartSession(userId: string, input: StartSessionInput): Promise<Response> {
  try {
    const result = await startSession({ userId, topicId: input.topicId ?? null }, { requestId: crypto.randomUUID() });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateActiveSessionError) {
      return NextResponse.json({ error: "Active practice session already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = await getSupabaseServerClient();
  const auth = await requireAuth(supabase);
  if (!auth.ok) return auth.response;
  const parseResult: ParseResult<StartSessionInput> = await parseBody(req, validateStartSessionInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleStartSession(auth.userId, parseResult.data);
}
