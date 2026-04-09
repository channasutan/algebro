import { NextRequest, NextResponse } from "next/server";
import { requireAuth, buildContext } from "@/app/api/v1/_helpers/auth";
import { createAttempt } from "@/modules/practice/services/create-attempt";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

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

  const context = buildContext();

  try {
    const result = await createAttempt({ sessionId, problemId, userId: auth.userId }, context);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}