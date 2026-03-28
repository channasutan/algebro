import { generateProblem } from "@/modules/problem-generator";
import type { ProblemRepository } from "@/modules/problem-generator/repositories/problem-repository";
import type { ServiceContext } from "@/lib/observability";
import type { CurriculumRepository } from "../repositories/curriculum-repository";
import type {
  GetRecommendedProblemInput,
  GetRecommendedProblemOutput,
} from "../contracts/get-recommended-problem";

// Fallback templateId for beginner/first-time users.
// Phase 7+: derive templateId dynamically from topic metadata (lookup by name or slug).
// Requires: seed row in problem_templates with id = 'default-beginner-template'
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
  const topicId = allProgress?.[0]?.topicId;

  // 3. Delegate to Problem Generator public API — never query problems table directly
  //    Phase 7+: derive difficultyLevel from mastery score (e.g. Math.ceil((1 - lowestMastery) * 5))
  const result = await generateProblem(
    problemRepo,
    {
      templateId: FALLBACK_TEMPLATE_ID,
      topicId,
      difficultyLevel: 1,
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
  return {
    problemId: result.problem.id,
    topicId: result.problem.topicId ?? "",
    difficulty: result.problem.difficultyLevel,
  };
}
