import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabasePracticeRepository } from "@/modules/practice/repositories/supabase-practice-repository";

const StepSubmitSchema = z.object({
  expression: z.string().min(1).max(2000),
  step_index: z.number().int().min(0),
});

async function verifyAttemptOwnership(
  supabase: SupabaseClient,
  attemptId: string,
  userId: string
): Promise<{ attempt: { id: string; user_id: string; status: string } | null; error?: string; status?: number }> {
  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id, user_id, status")
    .eq("id", attemptId)
    .single();

  if (error || !attempt) {
    return { attempt: null, error: "Attempt not found", status: 404 };
  }

  if (attempt.user_id !== userId) {
    return { attempt: null, error: "Forbidden", status: 403 };
  }

  if (attempt.status === "completed") {
    return { attempt: null, error: "Attempt is completed", status: 409 };
  }

  return { attempt };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attempt_id: string }> }
): Promise<Response> {
  const { attempt_id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownership = await verifyAttemptOwnership(supabase, attempt_id, user.id);

  if (ownership.error) {
    return Response.json({ error: ownership.error }, { status: ownership.status });
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
  request: Request,
  { params }: { params: Promise<{ attempt_id: string }> }
): Promise<Response> {
  const { attempt_id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownership = await verifyAttemptOwnership(supabase, attempt_id, user.id);

  if (ownership.error && ownership.status !== 409) {
    return Response.json({ error: ownership.error }, { status: ownership.status });
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
