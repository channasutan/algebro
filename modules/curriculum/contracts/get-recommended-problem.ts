// Contract: GetRecommendedProblem use-case
// Input/Output types only — no business logic, no external imports

export type GetRecommendedProblemInput = {
  userId: string;
};

export type GetRecommendedProblemOutput = {
  problemId: string;
  topicId: string;
  difficulty: number;
};
