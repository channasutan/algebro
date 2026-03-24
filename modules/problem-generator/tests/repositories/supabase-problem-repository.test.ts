import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRepositoryFromClient } from "../../repositories/supabase-problem-repository";
import type { GeneratedProblem, ProblemPoolEntry } from "../../domain";

// Mock Supabase client - creates a chainable mock that matches supabase-js query builder behavior
const makeMockChain = (finalValue: { data: unknown; error: null | object }) => {
  const chain: Record<string, unknown> = {};
  const end = vi.fn().mockResolvedValue(finalValue);

  // Terminal methods - return mock results directly (when repository calls .single()/.maybeSingle())
  chain.single = end;
  chain.maybeSingle = end;

  // Intermediate chainable methods - return the same chain object to allow method chaining
  const returnChain = () => chain;
  chain.select = vi.fn(returnChain);
  chain.insert = vi.fn(returnChain);
  chain.eq = vi.fn(returnChain);
  chain.order = vi.fn(returnChain);

  // Make chain itself awaitable - required for queries without .single()/.maybeSingle()
  // (e.g., listTemplates uses: await query which expects { data, error })
  // Using Promise.resolve ensures proper async resolution
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: (value: typeof finalValue) => void) => {
      Promise.resolve(finalValue).then(onFulfilled);
    },
    writable: true,
    configurable: true,
  });

  return chain;
};

const mockChainState = {
  value: { data: null as unknown, error: null as null | object },
};

const mockFrom = vi.fn(() =>
  makeMockChain(mockChainState.value)
);

const mockClient = {
  from: mockFrom,
} as unknown as Parameters<typeof createRepositoryFromClient>[0];

describe("SupabaseProblemRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChainState.value = { data: null, error: null };
  });

  describe("getTemplate", () => {
    it("returns template when found", async () => {
      const mockData = {
        id: "template-1",
        name: "Linear Equation",
        template_latex: "$a*x + $b = $c",
        parameter_schema: { a: { type: "int", min: 1, max: 10 } },
        base_difficulty: 2,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockChainState.value = { data: mockData, error: null };

      const repo = createRepositoryFromClient(mockClient);
      const result = await repo.getTemplate("template-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("template-1");
      expect(result?.name).toBe("Linear Equation");
      expect(result?.parameterSchema).toEqual({ a: { type: "int", min: 1, max: 10 } });
      expect(result?.baseDifficulty).toBe(2);
    });

    it("returns null when template not found", async () => {
      mockChainState.value = { data: null, error: null };

      const repo = createRepositoryFromClient(mockClient);
      const result = await repo.getTemplate("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("listTemplates", () => {
    it("returns array of templates", async () => {
      const mockData = [
        {
          id: "template-1",
          name: "Equation A",
          template_latex: "2x = 4",
          parameter_schema: null,
          base_difficulty: 1,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "template-2",
          name: "Equation B",
          template_latex: "3x + $a = 10",
          parameter_schema: { a: { type: "int", min: 1, max: 5 } },
          base_difficulty: 2,
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockChainState.value = { data: mockData, error: null };

      const repo = createRepositoryFromClient(mockClient);
      const result = await repo.listTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Equation A");
      expect(result[1].name).toBe("Equation B");
    });
  });

  describe("saveProblem", () => {
    it("saves problem and returns with id", async () => {
      const problem: GeneratedProblem = {
        id: "", // Will be assigned by DB
        templateId: "template-1",
        topicId: null,
        difficultyLevel: 3,
        problemLatex: "2x + 4 = 10",
        solutionLatex: "x = 3",
        parameters: { a: 2, b: 4, c: 10 },
        isValidated: true,
        createdAt: "",
      };

      const mockData = {
        id: "problem-1",
        template_id: "template-1",
        topic_id: null,
        difficulty_level: 3,
        problem_latex: "2x + 4 = 10",
        solution_latex: "x = 3",
        parameters: { a: 2, b: 4, c: 10 },
        is_validated: true,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockChainState.value = { data: mockData, error: null };

      const repo = createRepositoryFromClient(mockClient);
      const result = await repo.saveProblem(problem);

      expect(result.id).toBe("problem-1");
      expect(result.isValidated).toBe(true);
      expect(result.parameters).toEqual({ a: 2, b: 4, c: 10 });
    });
  });

  describe("addToPool", () => {
    it("adds problem to pool", async () => {
      const entry: ProblemPoolEntry = {
        id: "",
        problemId: "problem-1",
        topicId: "topic-1",
        createdAt: "",
      };

      const mockData = {
        id: "pool-1",
        problem_id: "problem-1",
        topic_id: "topic-1",
        created_at: "2024-01-01T00:00:00Z",
      };

      mockChainState.value = { data: mockData, error: null };

      const repo = createRepositoryFromClient(mockClient);
      const result = await repo.addToPool(entry);

      expect(result.id).toBe("pool-1");
      expect(result.problemId).toBe("problem-1");
    });
  });
});
