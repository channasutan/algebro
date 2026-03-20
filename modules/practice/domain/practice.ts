export type PracticeSession = {
  id: string;
  userId: string;
  topicId: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type Attempt = {
  id: string;
  sessionId: string;
  problemId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  isCorrect: boolean | null;
  createdAt: string;
};

export type SolutionStep = {
  id: string;
  attemptId: string;
  stepIndex: number;
  stepLatex: string;
  isValid: boolean | null;
  errorType: string | null;
  createdAt: string;
};
