import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { createAttempt } from "@/modules/practice";

export async function POST(req: NextRequest): Promise<NextResponse> {

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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