export { parseBody, type ParseResult } from "@/lib/api-helpers";
export { requireAuth } from "@/lib/auth/server-auth-facade";
export {
  createAttempt,
  submitStep,
  startSession,
  completeAttempt,
  DuplicateActiveSessionError,
} from "@/modules/practice";
