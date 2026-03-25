export type GeneratedProblem = {
  id: string;
  templateId: string | null;
  topicId: string | null;
  difficultyLevel: number;
  problemLatex: string;
  solutionLatex: string;
  parameters: Record<string, number> | null;
  isValidated: boolean;
  createdAt: string;
};
