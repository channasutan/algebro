export {
  startSession,
  type StartSessionInput
} from "./services/start-session";
export {
  createAttempt,
  type CreateAttemptInput
} from "./services/create-attempt";
export {
  submitStep,
  type SubmitStepInput
} from "./services/submit-step";
export {
  completeAttempt,
  type CompleteAttemptInput
} from "./services/complete-attempt";
export { 
  type PracticeSession, 
  type Attempt, 
  type SolutionStep 
} from "./domain/practice";
export type {
  StartPracticeResult,
  SubmitStepResult
} from "./contracts/practice";
export { 
  PracticeError, 
  SessionNotFoundError, 
  AttemptNotFoundError, 
  StepAdditionError,
  DuplicateActiveSessionError,
} from "./errors";
export { 
  getNextProblem 
} from "./services/get-next-problem";
export type {
  GetNextProblemInput,
  GetNextProblemResult
} from "./services/get-next-problem";

// For tests
export { eventBus } from "@/events/event-bus";

// Testing helpers — repo-injected variants
export { startSessionWithRepository } from "./services/start-session";
export { createAttemptWithRepository, type CreateAttemptResult } from "./services/create-attempt";
export { submitStepWithRepository } from "./services/submit-step";
export type { PracticeRepository } from "@/repositories/practice/practice-repository";
