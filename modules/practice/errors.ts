export class PracticeError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = "PracticeError";
  }
}

export class SessionNotFoundError extends PracticeError {
  constructor(sessionId: string) {
    super(`Practice session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

export class AttemptNotFoundError extends PracticeError {
  constructor(attemptId: string) {
    super(`Attempt not found: ${attemptId}`);
    this.name = "AttemptNotFoundError";
  }
}

export class StepAdditionError extends PracticeError {
  constructor(attemptId: string, message: string) {
    super(`Failed to add step to attempt ${attemptId}: ${message}`);
    this.name = "StepAdditionError";
  }
}

export class DuplicateActiveSessionError extends PracticeError {
  constructor(userId: string, topicId: string | null) {
    super(`Active session already exists for user ${userId} and topic ${topicId}`);
    this.name = "DuplicateActiveSessionError";
  }
}
