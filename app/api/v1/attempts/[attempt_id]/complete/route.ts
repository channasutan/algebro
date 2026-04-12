import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { completeAttemptForUser } from "@/modules/practice/controller";

export async function POST(req: NextRequest, { params }: { params: { attempt_id: string } }): Promise<NextResponse> {

  const { attempt_id } = params;
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "Invalid attempt_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("isCorrect" in body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { isCorrect, topicId } = body as { isCorrect: unknown; topicId?: string | null };
  if (typeof isCorrect !== "boolean") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (topicId !== undefined && topicId !== null && typeof topicId !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await completeAttemptForUser({ attemptId: attempt_id, isCorrect, topicId: topicId ?? null });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error("Unexpected error in complete route", {
      error: err instanceof Error ? err.message : String(err),
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}