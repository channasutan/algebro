import type { GeneratedProblem } from "../domain/generated-problem";

export type GenerateProblemInput = {
  templateId: string;
  topicId?: string;
  difficultyLevel: number;
  seed?: string;
};
export type GenerateProblemResult = {
  wasValidated: boolean;
  problem?: GeneratedProblem;
  errorType?: "template_not_found" | "validation_failed";
};
