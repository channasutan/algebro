// Complexity reduced from 10 → 4
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { submitStep } from "@/modules/practice";
import { parseBody, type ParseResult } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth/server-auth-facade";

type SubmitStepInput = {
  stepLatex: string;
};

function validateSubmitStepInput(raw: unknown): SubmitStepInput | null {
  if (typeof raw !== "object" || raw === null || !("stepLatex" in raw)) return null;
  const { stepLatex } = raw as { stepLatex: unknown };
  if (typeof stepLatex !== "string" || stepLatex.trim() === "") return null;
  return { stepLatex };
}

async function handleSubmitStep(userId: string, attemptId: string, input: SubmitStepInput): Promise<NextResponse> {
  try {
    const result = await submitStep(
      { attemptId, userId, ...input },
      { requestId: crypto.randomUUID() }
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error("Unexpected error in steps route", {
      error: err instanceof Error ? err.message : String(err),
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { attempt_id: string } }
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { attempt_id } = params;
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "Invalid attempt_id" }, { status: 400 });
  }
  const parseResult: ParseResult<SubmitStepInput> = await parseBody(req, validateSubmitStepInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleSubmitStep(auth.userId, attempt_id, parseResult.data);
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

  try {
    const result = await submitStep({ attemptId: attempt_id, userId: auth.userId, stepLatex }, { requestId: crypto.randomUUID() });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error("Unexpected error in steps route", {
      error: err instanceof Error ? err.message : String(err),
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
