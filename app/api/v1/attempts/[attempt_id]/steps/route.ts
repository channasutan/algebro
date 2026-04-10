import { NextRequest, NextResponse } from "next/server";
import { requireAuth, buildContext } from "@/lib/auth/server-auth";
import { logger } from "@/lib/observability";
import { submitStep } from "@/modules/practice";

export async function POST(req: NextRequest, { params }: { params: { attempt_id: string } }): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

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

  if (typeof body !== "object" || body === null || !("stepLatex" in body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { stepLatex } = body as { stepLatex: unknown };
  if (typeof stepLatex !== "string" || stepLatex.trim() === "") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const context = buildContext();

  try {
    const result = await submitStep({ attemptId: attempt_id, userId: auth.userId, stepLatex }, context);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error("Unexpected error in steps route", {
      error: err instanceof Error ? err.message : String(err),
      requestId: context.requestId,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
