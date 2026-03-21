import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { SolutionStep } from "../domain/practice";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { validateStep } from "@/modules/step-validation";

export type SubmitStepInput = {
  attemptId: string;
  userId: string;
  stepLatex: string;
};

export async function submitStep(
  input: SubmitStepInput,
  context: ServiceContext
): Promise<SolutionStep> {
  const repo = createSupabasePracticeRepository();
  return submitStepWithRepository(repo, input, context);
}

/**
 * Submits a solution step during a practice attempt.
 * Minimal validation for Phase 3.
 */
export async function submitStepWithRepository(
  repo: PracticeRepository,
  input: SubmitStepInput,
  context: ServiceContext
): Promise<SolutionStep> {
  const { attemptId, userId, stepLatex } = input;
  const { requestId } = context;
  const log = createServiceLogger(requestId);

  log.info({ 
    event: "practice.step", 
    meta: { 
      type: "domain", 
      userId, 
      phase: "start", 
      attemptId, 
      stepLatex: stepLatex.length > 20 ? stepLatex.slice(0, 20) + "..." : stepLatex 
    }
  });

  if (!stepLatex || stepLatex.trim() === "") {
    log.warn({ 
      event: "practice.step", 
      meta: { type: "domain", userId, phase: "validation", attemptId, outcome: "failure", reason: "empty" } 
    });
    throw new Error("[practice] Step cannot be empty");
  }

  try {
    // Get existing steps to calculate next index
    const existingSteps = await repo.getSteps(attemptId);
    const nextIndex = existingSteps.length;

    // Phase 4: AST-based step validation
    const previousLatex = getPreviousLatex(existingSteps);

    const validation = previousLatex !== null
      ? await validateStep({ previousLatex, currentLatex: stepLatex }, context)
      : { isValid: true, errorType: null }; // first step: skip validation

    const step = await repo.addStep(attemptId, nextIndex, stepLatex);
    const updatedStep = await repo.updateStep(step.id, {
      isValid: validation.isValid,
      errorType: validation.errorType,
    });

    log.info({ 
      event: "practice.step", 
      meta: { type: "domain", userId, phase: "complete", attemptId, stepId: updatedStep.id, outcome: "success" } 
    });
    return updatedStep;
  } catch (err) {
    log.error({ 
      event: "practice.step", 
      meta: { 
        type: "domain",
        userId,
        phase: "infra",
        outcome: "failure",
        attemptId, 
        error: err instanceof Error ? err.message : String(err) 
      }
    });
    throw err;
  }
}

function getPreviousLatex(steps: SolutionStep[]): string | null {
  return steps.length > 0 ? steps[steps.length - 1].stepLatex : null;
}
