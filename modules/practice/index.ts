export { 
  startSession, 
  startSessionWithRepository, 
  type StartSessionInput 
} from "./services/start-session";
export { 
  createAttempt, 
  createAttemptWithRepository, 
  type CreateAttemptInput 
} from "./services/create-attempt";
export { 
  submitStep, 
  submitStepWithRepository, 
  type SubmitStepInput 
} from "./services/submit-step";
export {
  completeAttempt,
  completeAttemptWithRepository,
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
  StepAdditionError 
} from "./errors";
