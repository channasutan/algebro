// Complexity reduced from 10 → 3
import { NextRequest, NextResponse } from "next/server";
import { startSession, DuplicateActiveSessionError, parseBody, type ParseResult, requireAuth } from "@/lib/services/practice-handler";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isPlainObject, isOptionalString } from "@/lib/validation-helpers";

type StartSessionInput = {
  topicId?: string | null;
};

function validateStartSessionInput(raw: unknown): StartSessionInput | null {
  if (!isPlainObject(raw) || !("topicId" in raw)) return null;
  const { topicId } = raw as { topicId?: unknown };
  if (!isOptionalString(topicId)) return null;
  return { topicId };
}

async function handleStartSession(userId: string, input: StartSessionInput): Promise<NextResponse> {
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(await getSupabaseServerClient());
  if (!auth.ok) return auth.response;
  const parseResult: ParseResult<StartSessionInput> = await parseBody(req, validateStartSessionInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleStartSession(auth.userId, parseResult.data);
}
