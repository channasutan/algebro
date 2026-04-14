// Complexity reduced from 12 → 4
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { completeAttempt, parseBody, type ParseResult, requireAuth } from "@/lib/services/practice-handler";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { isPlainObject, isOptionalString } from "@/lib/validation-helpers";

type CompleteAttemptInput = {
  isCorrect: boolean;
  topicId?: string | null;
};

function validateCompleteAttemptInput(raw: unknown): CompleteAttemptInput | null {
  if (!isPlainObject(raw) || !("isCorrect" in raw)) return null;
  const { isCorrect, topicId } = raw as { isCorrect: unknown; topicId?: unknown };
  if (typeof isCorrect !== "boolean") return null;
  if (!isOptionalString(topicId)) return null;
  return { isCorrect, topicId };
}

async function handleCompleteAttempt(userId: string, attemptId: string, input: CompleteAttemptInput): Promise<NextResponse> {
  try {
    const result = await completeAttempt({ attemptId, userId, ...input }, { requestId: crypto.randomUUID() });
    return NextResponse.json(result, { status: 200 });
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ attempt_id: string }> }): Promise<NextResponse> {
  const auth = await requireAuth(await getSupabaseServerClient());
  if (!auth.ok) return auth.response;
  const { attempt_id } = await params;
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "Invalid attempt_id" }, { status: 400 });
  }
  const parseResult: ParseResult<CompleteAttemptInput> = await parseBody(req, validateCompleteAttemptInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleCompleteAttempt(auth.userId, attempt_id, parseResult.data);
}
