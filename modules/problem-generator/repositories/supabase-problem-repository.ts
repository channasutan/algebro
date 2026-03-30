import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { dbSelect, dbInsert } from "@/lib/supabase/repository-utils";
import type { ProblemTemplate, ParameterSchema } from "../domain/problem-template";
import type { GeneratedProblem } from "../domain/generated-problem";
import type { ProblemPoolEntry } from "../domain/problem-pool-entry";
import type { ProblemRepository } from "./problem-repository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidTemplateReferenceError extends Error {
  constructor(templateId: string) {
    super(
      `[problem-generator.saveProblem] invalid template reference: expected UUID template id, received "${templateId}"`
    );
    this.name = "InvalidTemplateReferenceError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function createSupabaseProblemRepository(): Promise<ProblemRepository> {
  const client = await getSupabaseServerClient();
  return createRepositoryFromClient(client);
}

export function createRepositoryFromClient(
  client: SupabaseClient
): ProblemRepository {
  const getTemplate = async (
    templateId: string
  ): Promise<ProblemTemplate | null> => {
    const filters = UUID_PATTERN.test(templateId)
      ? { id: templateId }
      : { name: templateId };

    const data = await dbSelect<Record<string, unknown> | null>(client, "problem_templates", {
      filters,
      maybeSingle: true,
      context: "problem-generator.getTemplate",
    });

    return data ? mapTemplate(data) : null;
  };

  const listTemplates = async (): Promise<ProblemTemplate[]> => {
    const data = await dbSelect<Record<string, unknown>[]>(client, "problem_templates", {
      order: { column: "name", ascending: true },
      context: "problem-generator.listTemplates",
    });

    return data.map(mapTemplate);
  };

  const saveProblem = async (
    problem: GeneratedProblem
  ): Promise<GeneratedProblem> => {
    if (problem.templateId && !UUID_PATTERN.test(problem.templateId)) {
      throw new InvalidTemplateReferenceError(problem.templateId);
    }

    const data = await dbInsert<Record<string, unknown>>(client, "problems", {
      template_id: problem.templateId,
      topic_id: problem.topicId,
      difficulty_level: problem.difficultyLevel,
      problem_latex: problem.problemLatex,
      solution_latex: problem.solutionLatex,
      parameters: problem.parameters,
      is_validated: problem.isValidated,
    }, {
      context: "problem-generator.saveProblem",
    });

    return mapProblem(data);
  };

  const addToPool = async (
    entry: ProblemPoolEntry
  ): Promise<ProblemPoolEntry> => {
    const data = await dbInsert<Record<string, unknown>>(client, "problem_pool", {
      problem_id: entry.problemId,
      topic_id: entry.topicId,
    }, {
      context: "problem-generator.addToPool",
    });

    return mapPoolEntry(data);
  };

  const getPoolCount = async (topicId?: string): Promise<number> => {
    let query = client.from("problem_pool").select("*", { count: "exact", head: true });

    if (topicId) {
      query = query.eq("topic_id", topicId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`[problem-generator.getPoolCount] ${error.message}`, { cause: error });
    }

    return count ?? 0;
  };

  return {
    getTemplate,
    listTemplates,
    saveProblem,
    addToPool,
    getPoolCount,
  };
}

function mapTemplate(data: Record<string, unknown>): ProblemTemplate {
  return {
    id: data.id as string,
    name: data.name as string,
    templateLatex: data.template_latex as string,
    parameterSchema: (data.parameter_schema as ParameterSchema) ?? null,
    baseDifficulty: (data.base_difficulty as number) ?? 1,
    createdAt: data.created_at as string,
  };
}

function mapProblem(data: Record<string, unknown>): GeneratedProblem {
  return {
    id: data.id as string,
    templateId: data.template_id as string | null,
    topicId: data.topic_id as string | null,
    difficultyLevel: data.difficulty_level as number,
    problemLatex: data.problem_latex as string,
    solutionLatex: data.solution_latex as string,
    parameters: (data.parameters as Record<string, number>) ?? null,
    isValidated: (data.is_validated as boolean) ?? false,
    createdAt: data.created_at as string,
  };
}

function mapPoolEntry(data: Record<string, unknown>): ProblemPoolEntry {
  return {
    id: data.id as string,
    problemId: data.problem_id as string,
    topicId: data.topic_id as string | null,
    createdAt: data.created_at as string,
  };
}
