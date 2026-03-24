import type { ProblemRepository } from "../repositories/problem-repository";
import type { GenerateProblemInput, GenerateProblemResult } from "../contracts/generation";
import { randomizeParameters } from "./randomize-parameters";
import { renderTemplate } from "./render-template";
import { validateSolvability } from "./validate-solvability";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";

/**
 * Generates a problem from a template, randomizes parameters, validates solvability, and persists.
 *
 * @param repo - Problem repository for persistence
 * @param input - Generation input with template ID, optional topic, difficulty, and seed
 * @param context - Service context for logging
 * @returns Generation result with validation status and problem if successful
 */
export async function generateProblem(
  repo: ProblemRepository,
  input: GenerateProblemInput,
  context: ServiceContext
): Promise<GenerateProblemResult> {
  const log = createServiceLogger(context.requestId);

  log.info({
    event: "practice.generate-problem",
    meta: {
      type: "domain",
      phase: "start",
      userId: "system",
      templateId: input.templateId,
      topicId: input.topicId,
      difficultyLevel: input.difficultyLevel,
    },
  });

  // 1. Get the template
  const template = await repo.getTemplate(input.templateId);
  if (!template) {
    log.warn({
      event: "practice.generate-problem",
      meta: {
        type: "domain",
        phase: "validation",
        userId: "system",
        outcome: "failure",
        reason: "template_not_found",
      },
    });
    return { wasValidated: false, errorType: "template_not_found" };
  }

  // 2. Randomize parameters
  const parameters = randomizeParameters(
    template.parameterSchema ?? {},
    input.difficultyLevel,
    input.seed
  );

  // 3. Render template with parameters
  const rendered = renderTemplate(template.templateLatex, parameters);

  // 4. Validate solvability
  const validation = await validateSolvability(
    { problemLatex: rendered, solutionLatex: rendered },
    context
  );

  if (!validation.isSolvable) {
    log.warn({
      event: "practice.generate-problem",
      meta: {
        type: "domain",
        phase: "validation",
        userId: "system",
        outcome: "failure",
        reason: validation.errorType ?? "validation_failed",
      },
    });
    return { wasValidated: false, errorType: "validation_failed" };
  }

  // 5. Save the problem
  const saved = await repo.saveProblem({
    id: "",
    templateId: input.templateId,
    topicId: input.topicId ?? null,
    difficultyLevel: input.difficultyLevel,
    problemLatex: rendered,
    solutionLatex: rendered,
    parameters,
    isValidated: true,
    createdAt: "",
  });

  log.info({
    event: "practice.generate-problem",
    meta: {
      type: "domain",
      phase: "complete",
      userId: "system",
      outcome: "success",
      problemId: saved.id,
    },
  });

  return { wasValidated: true, problem: saved };
}
