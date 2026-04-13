// Complexity reduced from 10 → 3
import { NextRequest, NextResponse } from "next/server";
import { startSession, DuplicateActiveSessionError } from "@/modules/practice";
import { parseBody, type ParseResult } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth/server-auth-facade";

type StartSessionInput = {
  topicId?: string | null;
};

function validateStartSessionInput(raw: unknown): StartSessionInput | null {
  if (typeof raw !== "object" || raw === null || !("topicId" in raw)) return null;
  const { topicId } = raw as { topicId?: unknown };
  if (topicId !== undefined && topicId !== null && typeof topicId !== "string") return null;
  return { topicId };
}

async function handleStartSession(userId: string, input: StartSessionInput): Promise<NextResponse> {
  try {
    const result = await startSession({ userId, ...input }, { requestId: crypto.randomUUID() });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateActiveSessionError) {
      return NextResponse.json({ error: "Active practice session already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const parseResult: ParseResult<StartSessionInput> = await parseBody(req, validateStartSessionInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleStartSession(auth.userId, parseResult.data);
}

  if (typeof body !== "object" || body === null || !("topicId" in body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { topicId } = body as { topicId?: string | null };
  if (topicId !== undefined && topicId !== null && typeof topicId !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

    try {
      const result = await startSession({ userId: auth.userId, topicId }, { requestId: crypto.randomUUID() });
      return NextResponse.json(result, { status: 201 });
    } catch (err) {
     if (err instanceof DuplicateActiveSessionError) {
       return NextResponse.json({ error: "Active practice session already exists" }, { status: 409 });
     }
     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
   }
}
