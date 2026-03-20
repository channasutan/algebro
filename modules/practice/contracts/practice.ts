export type StartPracticeResult = {
  sessionId: string;
  attemptId: string;
  problemId: string;
};

export type SubmitStepResult = {
  stepId: string;
  stepIndex: number;
  stepLatex: string;
  isValid: boolean;
};
