import { getRequestId } from "@/lib/observability";
import { getCurrentSession } from "@/modules/authentication";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { getRecommendedProblem } from "@/modules/curriculum";
import { createSupabaseCurriculumRepository } from "@/modules/curriculum/repositories/supabase-curriculum-repository";
import { createSupabaseProblemRepository } from "@/modules/problem-generator";

export async function GET(): Promise<Response> {
  await ensureModulesBootstrapped();

  const { session } = await getCurrentSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = createSupabaseCurriculumRepository();
  const problemRepo = await createSupabaseProblemRepository();
  const result = await getRecommendedProblem(
    { userId: session.userId },
    repo,
    problemRepo,
    { requestId: await getRequestId() }
  );

  return Response.json(result, { status: 200 });
}
