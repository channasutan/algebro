import { z } from "zod";
import { createSupabasePracticeRepository } from "@/modules/practice/repositories/supabase-practice-repository";
import { verifyAuthenticatedAttemptAccess } from "@/modules/practice/repositories/supabase-attempt-access-repository";

const StepSubmitSchema = z.object({
  expression: z.string().min(1).max(2000),
  step_index: z.number().int().min(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attempt_id: string }> }
): Promise<Response> {
  const { attempt_id } = await params;
  const access = await verifyAuthenticatedAttemptAccess(attempt_id);

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  if (access.attemptStatus === "completed") {
    return Response.json({ error: "Attempt is completed" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = StepSubmitSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const repo = createSupabasePracticeRepository();

  try {
    const step = await repo.addStep(
      attempt_id,
      parsed.data.step_index,
      parsed.data.expression
    );

    return Response.json(step, { status: 201 });
  } catch (error) {
    console.error("[steps route] Failed to add step:", error);
    return Response.json({ error: "Failed to add step" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attempt_id: string }> }
): Promise<Response> {
  const { attempt_id } = await params;
  const access = await verifyAuthenticatedAttemptAccess(attempt_id);

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const repo = createSupabasePracticeRepository();

  try {
    const steps = await repo.getSteps(attempt_id);

    return Response.json(steps, { status: 200 });
  } catch (error) {
    console.error("[steps route] Failed to fetch steps:", error);
    return Response.json({ error: "Failed to fetch steps" }, { status: 500 });
  }
}
