import { generateProblem } from "@/modules/problem-generator";
import type { ProblemRepository } from "@/modules/problem-generator/repositories/problem-repository";
import type { ServiceContext } from "@/lib/observability/types";
import type { CurriculumRepository } from "../repositories/supabase-curriculum-repository";
import type {
  GetRecommendedProblemInput,
  GetRecommendedProblemOutput,
} from "../contracts/get-recommended-problem";

// Fallback templateId for beginner/first-time users.
// Phase 7+: derive templateId dynamically from topic metadata.
const FALLBACK_TEMPLATE_ID = "default-beginner-template";

export async function getRecommendedProblem(
  input: GetRecommendedProblemInput,
  repo: CurriculumRepository,
  problemRepo: ProblemRepository,
  context: ServiceContext
): Promise<GetRecommendedProblemOutput> {
  const { userId } = input;

  // 1. Get all topic progress ordered by mastery_score ASC
  const allProgress = await repo.getTopicProgressByUser(userId);

  // 2. Pick topicId: lowest mastery, or undefined for first-time user
  const topicId = allProgress?.[0]?.topicId ?? undefined;

  // 3. Delegate to Problem Generator public API — never query problems table directly
  const result = await generateProblem(
    problemRepo,
    {
      templateId: FALLBACK_TEMPLATE_ID,
      topicId,
      difficultyLevel: allProgress.length === 0 ? 1 : 1,
    },
    context
  );

  // 4. Propagate errors — do not swallow
  if (!result.wasValidated || !result.problem) {
    throw new Error(
      `[curriculum] getRecommendedProblem failed: ${result.errorType ?? "unknown"}`
    );
  }

  // 5. Map GeneratedProblem fields to contract output
  // GeneratedProblem.id → problemId
  // GeneratedProblem.topicId → topicId (nullable — fallback to empty string if null)
  // GeneratedProblem.difficultyLevel → difficulty
  return {
    problemId: result.problem.id,
    topicId: result.problem.topicId ?? "",
    difficulty: result.problem.difficultyLevel,
  };
}
