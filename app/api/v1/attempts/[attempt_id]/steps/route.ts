// Complexity reduced from 10 → 4
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { submitStep, parseBody, type ParseResult, requireAuth } from "@/lib/api-handlers/practice-handler";

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
  { params }: { params: Promise<{ attempt_id: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { attempt_id } = await params;
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "Invalid attempt_id" }, { status: 400 });
  }
  const parseResult: ParseResult<SubmitStepInput> = await parseBody(req, validateSubmitStepInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleSubmitStep(auth.userId, attempt_id, parseResult.data);
}
