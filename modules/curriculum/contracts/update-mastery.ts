// Contract: UpdateMastery use-case
// Input/Output types only — no business logic, no external imports

export type UpdateMasteryInput = {
  userId: string;
  topicId: string;
  attemptResult: "correct" | "incorrect";
};

export type UpdateMasteryOutput = {
  masteryScore: number;
  previousScore: number;
};
