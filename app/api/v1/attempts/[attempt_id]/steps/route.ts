import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { getRequestId } from "@/lib/api/request-id";
import { submitStepToAttempt } from "@/services/practice-service";
import { parseBody, type ParseResult } from "@/services/api-helpers-service";
import { requireAuth } from "@/services/auth-service";
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isString(v: unknown): v is string { return typeof v === "string"; }

type SubmitStepInput = {
  stepLatex: string;
};

function validateSubmitStepInput(raw: unknown): SubmitStepInput | null {
  if (!isPlainObject(raw)) return null;
  if (!("stepLatex" in raw)) return null;
  const { stepLatex } = raw as { stepLatex: unknown };
  if (!isString(stepLatex) || stepLatex.trim() === "") return null;
  return { stepLatex };
}

async function handleSubmitStep(req: NextRequest, userId: string, attemptId: string, input: SubmitStepInput): Promise<Response> {
  try {
    const result = await submitStepToAttempt({ attemptId, userId, ...input });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    logger.error({
      event: "system.route_error",
      meta: {
        type: "system",
        phase: "infra",
        error: err instanceof Error ? err.message : String(err),
      },
      requestId: getRequestId(req),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attempt_id: string }> }
): Promise<Response> {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { attempt_id } = await params;
  if (!attempt_id || typeof attempt_id !== "string") {
    return NextResponse.json({ error: "Invalid attempt_id" }, { status: 400 });
  }
  const parseResult: ParseResult<SubmitStepInput> = await parseBody(req, validateSubmitStepInput);
  if (!parseResult.ok) return parseResult.response;
  return await handleSubmitStep(req, auth.userId, attempt_id, parseResult.data);
}
