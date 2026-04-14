import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

import { PracticeSession, Attempt, SolutionStep } from "@/modules/practice/domain/practice";
import { PracticeRepository, AttemptWithStep, CreateAttemptWithStepInput } from "./practice-repository";
import { AttemptNotFoundError, StepAdditionError } from "@/modules/practice/errors";
import { dbSelect, dbInsert, dbUpdate } from "@/lib/supabase/repository-utils";

interface EntityUpdateOptions {
  client: SupabaseClient;
  table: string;
  id: string;
  values: Record<string, unknown>;
  context: string;
  errorFactory?: () => Error;
}

async function performEntityUpdate(options: EntityUpdateOptions): Promise<Record<string, unknown>> {
  return dbUpdate({
    client: options.client,
    table: options.table,
    id: options.id,
    values: options.values,
    options: {
      context: options.context,
      ...(options.errorFactory && { errorFactory: options.errorFactory })
    }
  });
}

function isValidRpcResponse(response: unknown): response is { attempt: unknown; step: unknown } {
  return (
    response !== null &&
    typeof response === "object" &&
    "attempt" in response &&
    "step" in response
  );
}

export function buildSupabasePracticeRepository(client: SupabaseClient): PracticeRepository {
  const getClient = () => client;
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

  const findActiveSession = async (
    userId: string,
    topicId: string | null
  ): Promise<PracticeSession | null> => {
    const client = await getClient();
    let query = client
      .from("practice_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("completed_at", null);

    if (topicId === null) {
      query = query.is("topic_id", null);
    } else {
      query = query.eq("topic_id", topicId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`[practice] findActiveSession failed: ${error.message}`);
    }

    return data ? mapSession(data as Record<string, unknown>) : null;
  };

  const createAttemptWithStep = async ({
    sessionId,
    problemId,
    stepIndex,
    stepLatex,
  }: CreateAttemptWithStepInput): Promise<AttemptWithStep> => {
    const client = await getClient();

    const { data, error } = await client.rpc("create_attempt_with_step", {
      p_session_id: sessionId,
      p_problem_id: problemId,
      p_step_index: stepIndex,
      p_step_latex: stepLatex,
    });

    if (error) {
      throw new Error(`[practice] createAttemptWithStep RPC failed: ${error.message}`);
    }

    // Defensive guard: RPC can return { data: null, error: null } in edge cases
    if (!isValidRpcResponse(data)) {
      throw new Error("[practice] createAttemptWithStep RPC returned unexpected shape");
    }

    return {
      attempt: mapAttempt(data.attempt as Record<string, unknown>),
      step: mapStep(data.step as Record<string, unknown>),
    };
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
    const dbUpdates = buildAttemptDbUpdates(updates);

    const data = await performEntityUpdate({
      client: await getClient(),
      table: "attempts",
      id: attemptId,
      values: dbUpdates,
      context: "practice",
      errorFactory: () => new AttemptNotFoundError(attemptId)
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
    const dbUpdates = buildStepDbUpdates(updates);

    const data = await performEntityUpdate({
      client: await getClient(),
      table: "solution_steps",
      id: stepId,
      values: dbUpdates,
      context: "practice"
    });

    return mapStep(data);
  };

  return {
    createSession,
    getSession,
    findActiveSession,
    createAttempt,
    getAttempt,
    updateAttempt,
    completeAttempt,
    createAttemptWithStep,
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

/**
 * Builds the database update object for attempt fields.
 * Business rule: only defined fields are included in the update to preserve existing values.
 * Maps domain field names to database column names.
 */
function buildAttemptDbUpdates(updates: Partial<Attempt>): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.isCorrect !== undefined) dbUpdates.is_correct = updates.isCorrect;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  return dbUpdates;
}

/**
 * Builds the database update object for solution step fields.
 * Business rule: only defined fields are included in the update to preserve existing values.
 * Maps domain field names to database column names.
 */
function buildStepDbUpdates(updates: Partial<SolutionStep>): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.isValid !== undefined) dbUpdates.is_valid = updates.isValid;
  if (updates.errorType !== undefined) dbUpdates.error_type = updates.errorType;
  return dbUpdates;
}
