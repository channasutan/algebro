import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { completePracticeAttempt } from "@/services/practice-service";
import { parseBody, type ParseResult } from "@/services/api-helpers-service";
import { requireAuth } from "@/services/auth-service";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isOptionalString(v: unknown): v is string | null | undefined {
  return v === null || v === undefined || typeof v === "string";
}

type CompleteAttemptInput = {
  isCorrect: boolean;
  topicId?: string | null;
};

function validateCompleteAttemptInput(raw: unknown): CompleteAttemptInput | null {
  if (!isPlainObject(raw)) return null;
  if (!("isCorrect" in raw)) return null;
  const { isCorrect, topicId } = raw as { isCorrect: unknown; topicId?: unknown };
  if (typeof isCorrect !== "boolean") return null;
  if (!isOptionalString(topicId)) return null;
  return { isCorrect, topicId };
}

async function handleCompleteAttempt(userId: string, attemptId: string, input: CompleteAttemptInput): Promise<Response> {
  try {
    const result = await completePracticeAttempt({ attemptId, userId, ...input });
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ attempt_id: string }> }): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { attempt_id } = await params;
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "Invalid attempt_id" }, { status: 400 });
  }
  const parseResult: ParseResult<CompleteAttemptInput> = await parseBody(req, validateCompleteAttemptInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleCompleteAttempt(auth.userId, attempt_id, parseResult.data);
}
