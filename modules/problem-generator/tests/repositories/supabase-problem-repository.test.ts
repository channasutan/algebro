import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRepositoryFromClient } from "../../repositories/supabase-problem-repository";
import type { GeneratedProblem, ProblemPoolEntry } from "../../domain";

const TEMPLATE_UUID = "11111111-1111-4111-8111-111111111111";

// Mock Supabase client - creates a chainable mock that matches supabase-js query builder behavior
// Uses Proxy to handle await without storing 'then' property (SonarCloud friendly)
const makeMockChain = () => {
  // Terminal handler - returns resolved value directly (no stored 'then' property)
  const end = vi.fn().mockImplementation(() => Promise.resolve(mockChainState.value));

  // Create the chain object
  const chain: Record<string, unknown> = {
    single: end,
    maybeSingle: end,
    // select/insert must return a chain to support further chaining (eq, order, single, etc.)
    select: () => proxy,
    insert: () => proxy,
    eq: () => proxy,
    order: () => proxy,
  };

  // Use Proxy to dynamically handle 'then' property without storing it
  const proxy = new Proxy(chain, {
    get(target, prop) {
      // Dynamically provide 'then' for await - not stored on the object
      if (prop === "then") {
        return (resolve: (val: unknown) => void) => {
          Promise.resolve(mockChainState.value).then(resolve);
        };
      }
      const value = target[prop as keyof typeof target];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  return proxy;
};

const mockChainState = {
  value: { data: null as unknown, error: null as null | object },
};

const mockFrom = vi.fn(() =>
  makeMockChain()
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
        id: TEMPLATE_UUID,
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
      expect(result?.id).toBe(TEMPLATE_UUID);
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
          id: TEMPLATE_UUID,
          name: "Equation A",
          template_latex: "2x = 4",
          parameter_schema: null,
          base_difficulty: 1,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
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
        templateId: TEMPLATE_UUID,
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
        template_id: TEMPLATE_UUID,
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

    it("throws clear error when templateId is not a UUID", async () => {
      const problem: GeneratedProblem = {
        id: "",
        templateId: "default-beginner-template",
        topicId: null,
        difficultyLevel: 1,
        problemLatex: "x = 2",
        solutionLatex: "2",
        parameters: null,
        isValidated: true,
        createdAt: "",
      };

      const repo = createRepositoryFromClient(mockClient);

      await expect(repo.saveProblem(problem)).rejects.toThrow(
        "invalid template reference: expected UUID template id"
      );
      expect(mockFrom).not.toHaveBeenCalledWith("problems");
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
