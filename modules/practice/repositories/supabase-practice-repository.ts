import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { PracticeSession, Attempt, SolutionStep } from "../domain/practice";
import { PracticeRepository } from "./practice-repository";
import { AttemptNotFoundError, StepAdditionError } from "../errors";
import { dbSelect, dbInsert, dbUpdate } from "@/lib/supabase/repository-utils";

export function buildSupabasePracticeRepository(client: SupabaseClient): PracticeRepository {
  const getClient = () => Promise.resolve(client);
  return createRepositoryFromClientFactory(getClient);
}

export function createSupabasePracticeRepository(): PracticeRepository {
  return createRepositoryFromClientFactory(getSupabaseServerClient);
}

function createRepositoryFromClientFactory(
  getClient: () => SupabaseClient | Promise<SupabaseClient>
): PracticeRepository {
  const createSession = async (userId: string, topicId: string | null): Promise<PracticeSession> => {
    const data = await dbInsert<Record<string, unknown>>(await getClient(), "practice_sessions", {
      user_id: userId,
      topic_id: topicId,
    }, { context: "practice" });

    return mapSession(data);
  };

  const getSession = async (sessionId: string): Promise<PracticeSession | null> => {
    const data = await dbSelect<Record<string, unknown> | null>(await getClient(), "practice_sessions", {
      filters: { id: sessionId },
      maybeSingle: true,
      context: "practice"
    });

    return data ? mapSession(data) : null;
  };

  const createAttempt = async (sessionId: string, problemId: string, userId: string): Promise<Attempt> => {
    const data = await dbInsert<Record<string, unknown>>(await getClient(), "attempts", {
      session_id: sessionId,
      problem_id: problemId,
      user_id: userId,
    }, { context: "practice" });

    return mapAttempt(data);
  };

  const getAttempt = async (attemptId: string): Promise<Attempt | null> => {
    const data = await dbSelect<Record<string, unknown> | null>(await getClient(), "attempts", {
      filters: { id: attemptId },
      maybeSingle: true,
      context: "practice"
    });

    return data ? mapAttempt(data) : null;
  };

  const updateAttempt = async (attemptId: string, updates: Partial<Attempt>): Promise<Attempt> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.isCorrect !== undefined) dbUpdates.is_correct = updates.isCorrect;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

    const data = await dbUpdate<Record<string, unknown>>({
      client: await getClient(),
      table: "attempts",
      id: attemptId,
      values: dbUpdates,
      options: {
        context: "practice",
        errorFactory: () => new AttemptNotFoundError(attemptId)
      }
    });

    return mapAttempt(data);
  };

  const completeAttempt = async (
    attemptId: string,
    input: {
      completedAt: string;
      isCorrect: boolean;
    }
  ): Promise<Attempt> => {
    const data = await dbUpdate<Record<string, unknown>>({
      client: await getClient(),
      table: "attempts",
      id: attemptId,
      values: {
        completed_at: input.completedAt,
        is_correct: input.isCorrect,
      },
      options: {
        context: "practice",
        errorFactory: () => new AttemptNotFoundError(attemptId)
      }
    });

    return mapAttempt(data);
  };

  const addStep = async (attemptId: string, stepIndex: number, stepLatex: string): Promise<SolutionStep> => {
    const data = await dbInsert<Record<string, unknown>>(await getClient(), "solution_steps", {
      attempt_id: attemptId,
      step_index: stepIndex,
      step_latex: stepLatex,
    }, { 
      context: "practice",
      errorFactory: (error) => new StepAdditionError(attemptId, error.message)
    });

    return mapStep(data);
  };

  const getSteps = async (attemptId: string): Promise<SolutionStep[]> => {
    const data = await dbSelect<Record<string, unknown>[]>(await getClient(), "solution_steps", {
      filters: { attempt_id: attemptId },
      order: { column: "step_index", ascending: true },
      context: "practice"
    });

    return data.map(mapStep);
  };

  const updateStep = async (stepId: string, updates: Partial<SolutionStep>): Promise<SolutionStep> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.isValid !== undefined) dbUpdates.is_valid = updates.isValid;
    if (updates.errorType !== undefined) dbUpdates.error_type = updates.errorType;

    const data = await dbUpdate<Record<string, unknown>>({
      client: await getClient(),
      table: "solution_steps",
      id: stepId,
      values: dbUpdates,
      options: {
        context: "practice"
      }
    });

    return mapStep(data);
  };

  return {
    createSession,
    getSession,
    createAttempt,
    getAttempt,
    updateAttempt,
    completeAttempt,
    addStep,
    getSteps,
    updateStep,
  };
}

function mapSession(data: Record<string, unknown>): PracticeSession {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    topicId: data.topic_id as string | null,
    startedAt: data.started_at as string,
    completedAt: data.completed_at as string | null,
    createdAt: data.created_at as string,
  };
}

function mapAttempt(data: Record<string, unknown>): Attempt {
  return {
    id: data.id as string,
    sessionId: data.session_id as string,
    problemId: data.problem_id as string,
    userId: data.user_id as string,
    startedAt: data.started_at as string,
    completedAt: data.completed_at as string | null,
    isCorrect: data.is_correct as boolean | null,
    createdAt: data.created_at as string,
  };
}

function mapStep(data: Record<string, unknown>): SolutionStep {
  return {
    id: data.id as string,
    attemptId: data.attempt_id as string,
    stepIndex: data.step_index as number,
    stepLatex: data.step_latex as string,
    isValid: data.is_valid as boolean | null,
    errorType: data.error_type as string | null,
    createdAt: data.created_at as string,
  };
}
