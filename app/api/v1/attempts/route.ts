// Complexity reduced from 9 → 3
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { createAttempt, parseBody, type ParseResult, requireAuth } from "@/lib/services/practice-handler";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isPlainObject, isString } from "@/lib/validation-helpers";

type CreateAttemptInput = {
  sessionId: string;
  problemId: string;
};

function validateCreateAttemptInput(raw: unknown): CreateAttemptInput | null {
  if (!isPlainObject(raw) || !("sessionId" in raw) || !("problemId" in raw)) return null;
  const { sessionId, problemId } = raw as { sessionId: unknown; problemId: unknown };
  if (!isString(sessionId) || !isString(problemId)) return null;
  return { sessionId, problemId };
}

async function handleCreateAttempt(userId: string, input: CreateAttemptInput): Promise<NextResponse> {
  try {
    const result = await createAttempt(
      { ...input, userId },
      { requestId: crypto.randomUUID() }
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error({
      event: "system.route_error",
      meta: {
        type: "system",
        phase: "infra",
        error: err instanceof Error ? err.message : String(err),
      },
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(await getSupabaseServerClient());
  if (!auth.ok) return auth.response;
  const parseResult: ParseResult<CreateAttemptInput> = await parseBody(req, validateCreateAttemptInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleCreateAttempt(auth.userId, parseResult.data);
}
