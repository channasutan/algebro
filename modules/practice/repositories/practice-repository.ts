import { PracticeSession, Attempt, SolutionStep } from "../domain/practice";

export interface PracticeRepository {
  createSession(userId: string, topicId: string | null): Promise<PracticeSession>;
  getSession(sessionId: string): Promise<PracticeSession | null>;
  
  createAttempt(sessionId: string, problemId: string, userId: string): Promise<Attempt>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  updateAttempt(attemptId: string, updates: Partial<Attempt>): Promise<Attempt>;
  completeAttempt(
    attemptId: string,
    input: {
      completedAt: string;
      isCorrect: boolean;
    }
  ): Promise<Attempt>;
  
  addStep(attemptId: string, stepIndex: number, stepLatex: string): Promise<SolutionStep>;
  getSteps(attemptId: string): Promise<SolutionStep[]>;
  updateStep(stepId: string, updates: Partial<SolutionStep>): Promise<SolutionStep>;
}
