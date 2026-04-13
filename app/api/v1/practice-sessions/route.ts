import { NextRequest, NextResponse } from "next/server";
import { startSession, DuplicateActiveSessionError } from "@/modules/practice";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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
