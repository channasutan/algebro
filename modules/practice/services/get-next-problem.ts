import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { getRecommendedProblem } from "@/modules/curriculum";
import { createSupabaseCurriculumRepository } from "@/modules/curriculum/repositories/supabase-curriculum-repository";
import {
  createSupabaseProblemRepository,
  generateProblem
} from "@/modules/problem-generator";

export type GetNextProblemInput = {
  userId: string;
  topicId: string | null;
};

export type GetNextProblemResult = {
  problemId: string;
  topicId: string | null;
};

export async function getNextProblem(
  input: GetNextProblemInput,
  context: ServiceContext
): Promise<GetNextProblemResult> {
  const log = createServiceLogger(context.requestId);
  const curriculumRepo = createSupabaseCurriculumRepository();
  const problemRepo = await createSupabaseProblemRepository();

  try {
    const recommended = await getRecommendedProblem(
      { userId: input.userId },
      curriculumRepo,
      problemRepo,
      context
    );

    return {
      problemId: recommended.problemId,
      topicId: recommended.topicId
    };
  } catch (error) {
    log.warn({
      event: "practice.next-problem",
      meta: {
        type: "domain",
        phase: "validation",
        userId: input.userId,
        reason: "curriculum_unavailable",
        error: error instanceof Error ? error.message : String(error)
      }
    });

    const templates = await problemRepo.listTemplates();
    if (templates.length === 0) {
      throw new Error("[practice.next-problem] no templates available for fallback generation");
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    const generated = await generateProblem(
      problemRepo,
      {
        templateId: template.name,
        topicId: input.topicId ?? undefined,
        difficultyLevel: 1
      },
      context
    );

    if (!generated.wasValidated || !generated.problem) {
      throw new Error(
        `[practice.next-problem] fallback generation failed: ${generated.errorType ?? "unknown"}`
      );
    }

    return {
      problemId: generated.problem.id,
      topicId: generated.problem.topicId ?? input.topicId ?? null
    };
  }
}
