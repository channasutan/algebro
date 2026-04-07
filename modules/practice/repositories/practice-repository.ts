import { PracticeSession, Attempt, SolutionStep } from "../domain/practice";

export type AttemptWithStep = {
  attempt: Attempt;
  step: SolutionStep;
};

export interface PracticeRepository {
  // ── Session ──────────────────────────────────────────────────
  createSession(userId: string, topicId: string | null): Promise<PracticeSession>;
  getSession(sessionId: string): Promise<PracticeSession | null>;
  /** Returns the active (not yet completed) session for this user+topic, or null. */
  findActiveSession(userId: string, topicId: string | null): Promise<PracticeSession | null>;

  // ── Attempt ───────────────────────────────────────────────────
  createAttempt(sessionId: string, problemId: string, userId: string): Promise<Attempt>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  updateAttempt(attemptId: string, updates: Partial<Attempt>): Promise<Attempt>;
  completeAttempt(
    attemptId: string,
    input: { completedAt: string; isCorrect: boolean }
  ): Promise<Attempt>;
  /** Creates an attempt and its first solution step in a single DB transaction. */
  createAttemptWithStep(
    sessionId: string,
    problemId: string,
    userId: string,
    stepIndex: number,
    stepLatex: string
  ): Promise<AttemptWithStep>;

  // ── Steps ─────────────────────────────────────────────────────
  addStep(attemptId: string, stepIndex: number, stepLatex: string): Promise<SolutionStep>;
  getSteps(attemptId: string): Promise<SolutionStep[]>;
  updateStep(stepId: string, updates: Partial<SolutionStep>): Promise<SolutionStep>;
}
