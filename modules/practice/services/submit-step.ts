import { createSupabasePracticeRepository } from "../repositories/supabase-practice-repository";
import { PracticeRepository } from "../repositories/practice-repository";
import { SolutionStep } from "../domain/practice";
import { createServiceLogger, type ServiceContext } from "@/lib/observability";
import { validateStep } from "@/modules/step-validation";
import type { ValidationErrorType, StepType } from "@/modules/step-validation/contracts/validation";
import { eventBus } from "@/events/event-bus";
import { createDomainEvent } from "@/events/event-types";

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
 * Phase 4: integrates AST-based step validation via validateStep.
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
      stepLatex: truncateForLog(stepLatex) 
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

    const validation = previousLatex === null
      ? { isValid: true, errorType: null, stepType: null } // first step: skip validation
      : await validateStep({ previousLatex, currentLatex: stepLatex }, context);

    const step = await repo.addStep(attemptId, nextIndex, stepLatex);
    const updatedStep = await repo.updateStep(step.id, {
      isValid: validation.isValid,
      errorType: validation.errorType,
    });

    publishStepValidatedEvent({
      nextIndex,
      validation,
      attemptId,
      userId
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
  return steps.length > 0 ? steps.at(-1)!.stepLatex : null;
}

function truncateForLog(value: string, maxLength = 20): string {
  return value.length > maxLength ? value.slice(0, maxLength) + "..." : value;
}

function publishStepValidatedEvent(params: {
  nextIndex: number;
  validation: { isValid: boolean; errorType: ValidationErrorType | null; stepType: StepType | null };
  attemptId: string;
  userId: string;
}): void {
  eventBus.publish(
    createDomainEvent({
      eventType: "step_validated",
      payload: {
        step_index: params.nextIndex,
        is_valid: params.validation.isValid,
        error_type: params.validation.errorType,
        step_type: params.validation.stepType ?? null,
        attempt_id: params.attemptId,
        user_id: params.userId
      }
    })
  ).catch(() => {
    // fire-and-forget: intentionally ignored
  });
}
