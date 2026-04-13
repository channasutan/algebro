// Complexity reduced from 9 → 3
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { createAttempt } from "@/modules/practice";
import { parseBody, type ParseResult } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth/server-auth-facade";

type CreateAttemptInput = {
  sessionId: string;
  problemId: string;
};

function validateCreateAttemptInput(raw: unknown): CreateAttemptInput | null {
  if (
    typeof raw !== "object" || raw === null ||
    !("sessionId" in raw) || !("problemId" in raw)
  ) return null;
  const { sessionId, problemId } = raw as { sessionId: unknown; problemId: unknown };
  if (typeof sessionId !== "string" || typeof problemId !== "string") return null;
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
    logger.error("Unexpected error in attempts route", {
      error: err instanceof Error ? err.message : String(err),
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const parseResult: ParseResult<CreateAttemptInput> = await parseBody(req, validateCreateAttemptInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleCreateAttempt(auth.userId, parseResult.data);
}

  if (typeof body !== "object" || body === null || !("sessionId" in body) || !("problemId" in body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { sessionId, problemId } = body as { sessionId: unknown; problemId: unknown };
  if (typeof sessionId !== "string" || typeof problemId !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await createAttempt({ sessionId, problemId, userId: auth.userId }, { requestId: crypto.randomUUID() });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error("Unexpected error in attempts route", {
      error: err instanceof Error ? err.message : String(err),
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}