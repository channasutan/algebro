import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { createNewAttempt } from "@/services/practice-service";
import { parseBody, type ParseResult } from "@/services/api-helpers-service";
import { requireAuth } from "@/services/auth-service";
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isString(v: unknown): v is string { return typeof v === "string"; }

type CreateAttemptInput = {
  sessionId: string;
  problemId: string;
};

function validateCreateAttemptInput(raw: unknown): CreateAttemptInput | null {
  if (!isPlainObject(raw)) return null;
  if (!("sessionId" in raw) || !("problemId" in raw)) return null;
  const { sessionId, problemId } = raw as { sessionId: unknown; problemId: unknown };
  if (!isString(sessionId)) return null;
  if (!isString(problemId)) return null;
  return { sessionId, problemId };
}

async function handleCreateAttempt(userId: string, input: CreateAttemptInput): Promise<Response> {
  try {
    const result = await createNewAttempt({ ...input, userId });
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

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const parseResult: ParseResult<CreateAttemptInput> = await parseBody(req, validateCreateAttemptInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleCreateAttempt(auth.userId, parseResult.data);
}
