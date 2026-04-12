import { getPracticeSupabaseClient } from "./infrastructure/supabase-provider";
import { getUser } from "@/lib/auth/user";
import { startSession } from "./services/start-session";
import { createAttempt } from "./services/create-attempt";
import { submitStep } from "./services/submit-step";
import { completeAttempt } from "./services/complete-attempt";
import { DuplicateActiveSessionError } from "./errors";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

async function requireAuth(): Promise<AuthResult> {
  const supabase = getPracticeSupabaseClient();
  const user = await getUser(supabase);

  if (!user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    };
  }

  return { ok: true, userId: user.id };
}

export async function startSessionForUser(input: { topicId?: string | null }): Promise<ReturnType<typeof startSession>> {
  const auth = await requireAuth();
  if (!auth.ok) throw new Error("Unauthorized");

  return startSession({ userId: auth.userId, topicId: input.topicId ?? null }, { requestId: crypto.randomUUID() });
}

export async function createAttemptForUser(input: { sessionId: string; problemId: string }): Promise<ReturnType<typeof createAttempt>> {
  const auth = await requireAuth();
  if (!auth.ok) throw new Error("Unauthorized");

  return createAttempt({ sessionId: input.sessionId, problemId: input.problemId, userId: auth.userId }, { requestId: crypto.randomUUID() });
}

export async function submitStepForUser(input: { attemptId: string; stepLatex: string }): Promise<ReturnType<typeof submitStep>> {
  const auth = await requireAuth();
  if (!auth.ok) throw new Error("Unauthorized");

  return submitStep({ attemptId: input.attemptId, userId: auth.userId, stepLatex: input.stepLatex }, { requestId: crypto.randomUUID() });
}

export async function completeAttemptForUser(input: { attemptId: string; isCorrect: boolean; topicId?: string | null }): Promise<ReturnType<typeof completeAttempt>> {
  const auth = await requireAuth();
  if (!auth.ok) throw new Error("Unauthorized");

  return completeAttempt({ attemptId: input.attemptId, userId: auth.userId, isCorrect: input.isCorrect, topicId: input.topicId ?? null }, { requestId: crypto.randomUUID() });
}

export { DuplicateActiveSessionError } from './errors';