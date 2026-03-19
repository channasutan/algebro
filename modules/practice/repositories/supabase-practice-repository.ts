import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { PracticeSession, Attempt, SolutionStep } from "../domain/practice";
import { PracticeRepository } from "./practice-repository";
import { AttemptNotFoundError, StepAdditionError } from "../errors";

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
    const client = await getClient();
    const { data, error } = await client
      .from("practice_sessions")
      .insert({
        user_id: userId,
        topic_id: topicId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`[practice] ${error.message}`, { cause: error });
    }

    return mapSession(data as Record<string, unknown>);
  };

  const getSession = async (sessionId: string): Promise<PracticeSession | null> => {
    const client = await getClient();
    const { data, error } = await client
      .from("practice_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`[practice] ${error.message}`, { cause: error });
    }

    return data ? mapSession(data as Record<string, unknown>) : null;
  };

  const createAttempt = async (sessionId: string, problemId: string, userId: string): Promise<Attempt> => {
    const client = await getClient();
    const { data, error } = await client
      .from("attempts")
      .insert({
        session_id: sessionId,
        problem_id: problemId,
        user_id: userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`[practice] ${error.message}`, { cause: error });
    }

    return mapAttempt(data as Record<string, unknown>);
  };

  const getAttempt = async (attemptId: string): Promise<Attempt | null> => {
    const client = await getClient();
    const { data, error } = await client
      .from("attempts")
      .select("*")
      .eq("id", attemptId)
      .maybeSingle();

    if (error) {
      throw new Error(`[practice] ${error.message}`, { cause: error });
    }

    return data ? mapAttempt(data as Record<string, unknown>) : null;
  };

  const updateAttempt = async (attemptId: string, updates: Partial<Attempt>): Promise<Attempt> => {
    const client = await getClient();
    
    const dbUpdates: Record<string, unknown> = {};
    if (updates.isCorrect !== undefined) dbUpdates.is_correct = updates.isCorrect;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

    const { data, error } = await client
      .from("attempts")
      .update(dbUpdates)
      .eq("id", attemptId)
      .select("*")
      .single();

    if (error) {
      throw new AttemptNotFoundError(attemptId);
    }

    return mapAttempt(data as Record<string, unknown>);
  };

  const addStep = async (attemptId: string, stepIndex: number, stepLatex: string): Promise<SolutionStep> => {
    const client = await getClient();
    const { data, error } = await client
      .from("solution_steps")
      .insert({
        attempt_id: attemptId,
        step_index: stepIndex,
        step_latex: stepLatex,
      })
      .select("*")
      .single();

    if (error) {
      throw new StepAdditionError(attemptId, error.message);
    }

    return mapStep(data as Record<string, unknown>);
  };

  const getSteps = async (attemptId: string): Promise<SolutionStep[]> => {
    const client = await getClient();
    const { data, error } = await client
      .from("solution_steps")
      .select("*")
      .eq("attempt_id", attemptId)
      .order("step_index", { ascending: true });

    if (error) {
      throw new Error(`[practice] ${error.message}`, { cause: error });
    }

    return (data || []).map(d => mapStep(d as Record<string, unknown>));
  };

  const updateStep = async (stepId: string, updates: Partial<SolutionStep>): Promise<SolutionStep> => {
    const client = await getClient();
    
    const dbUpdates: Record<string, unknown> = {};
    if (updates.isValid !== undefined) dbUpdates.is_valid = updates.isValid;
    if (updates.errorType !== undefined) dbUpdates.error_type = updates.errorType;

    const { data, error } = await client
      .from("solution_steps")
      .update(dbUpdates)
      .eq("id", stepId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`[practice] ${error.message}`, { cause: error });
    }

    return mapStep(data as Record<string, unknown>);
  };

  return {
    createSession,
    getSession,
    createAttempt,
    getAttempt,
    updateAttempt,
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
