import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Must be first: mock next/headers before importing server-side modules
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import {
  createSupabaseProblemRepository,
  generateProblem,
  populatePool,
  type GenerateProblemInput,
} from "@/modules/problem-generator";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

// Mock SymPy client for deterministic tests
vi.mock("@/lib/math/sympy-client", () => ({
  sympyClient: {
    evaluate: vi.fn(() => Promise.resolve({ result: { x: 3 } })),
  },
}));

const context = { requestId: "integration-test" };

describe("Problem Generator Integration", () => {
  const isRealDB = process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://test.supabase.co"
    && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isRealDB) {
    it.skip("skipped: no real Supabase URL configured", () => {});
    return;
  }

  let repo: Awaited<ReturnType<typeof createSupabaseProblemRepository>>;
  let testTemplateId: string;
  const adminClient = getSupabaseAdminClient();

  beforeAll(async () => {
    repo = await createSupabaseProblemRepository();

    // Create test template
    const { data: template, error } = await adminClient
      .from("problem_templates")
      .insert({
        name: "Integration Test Template",
        template_latex: "$a*x + $b = $c",
        parameter_schema: {
          a: { type: "int", min: 1, max: 5 },
          b: { type: "int", min: 1, max: 10 },
          c: { type: "int", min: 10, max: 20 },
        },
        base_difficulty: 2,
      } as any)
      .select()
      .single();

    if (error) throw error;
    testTemplateId = (template as { id: string }).id;
  });

  afterAll(async () => {
    // Clean up test data
    await adminClient
      .from("problem_pool")
      .delete()
      .eq("topic_id", "integration-test-topic");

    await adminClient
      .from("problems")
      .delete()
      .eq("topic_id", "integration-test-topic");

    await adminClient
      .from("problem_templates")
      .delete()
      .eq("id", testTemplateId);
  });

  describe("generateProblem", () => {
    it("generates and persists a problem with real database", async () => {
      const input: GenerateProblemInput = {
        templateId: testTemplateId,
        topicId: "integration-test-topic",
        difficultyLevel: 3,
      };

      const result = await generateProblem(repo, input, context);

      expect(result.wasValidated).toBe(true);
      expect(result.problem).toBeDefined();
      expect(result.problem?.templateId).toBe(testTemplateId);
      expect(result.problem?.topicId).toBe("integration-test-topic");
      expect(result.problem?.difficultyLevel).toBe(3);
      expect(result.problem?.isValidated).toBe(true);
      expect(result.problem?.parameters).toBeDefined();
      expect(result.problem?.problemLatex).toContain("*x");
    });

    it("returns error for non-existent template", async () => {
      const input: GenerateProblemInput = {
        templateId: "00000000-0000-0000-0000-000000000000",
        difficultyLevel: 3,
      };

      const result = await generateProblem(repo, input, context);

      expect(result.wasValidated).toBe(false);
      expect(result.errorType).toBe("template_not_found");
    });

    it("stores parameters as JSON in database", async () => {
      const input: GenerateProblemInput = {
        templateId: testTemplateId,
        topicId: "integration-test-topic",
        difficultyLevel: 2,
        seed: "test-seed-123",
      };

      const result = await generateProblem(repo, input, context);

      expect(result.problem?.parameters).toHaveProperty("a");
      expect(result.problem?.parameters).toHaveProperty("b");
      expect(result.problem?.parameters).toHaveProperty("c");
      expect(typeof result.problem?.parameters?.a).toBe("number");
    });
  });

  describe("populatePool", () => {
    it("batch generates problems and populates pool", async () => {
      const result = await populatePool(
        repo,
        {
          templateId: testTemplateId,
          topicId: "integration-test-topic",
          difficulty: 2,
          count: 5,
        },
        context
      );

      expect(result.generated).toBeGreaterThan(0);
      expect(result.generated + result.failed).toBe(5);

      // Verify pool entries exist
      const poolCount = await repo.getPoolCount("integration-test-topic");
      expect(poolCount).toBeGreaterThanOrEqual(result.generated);
    });

    it("handles partial failures gracefully", async () => {
      // This test assumes some generations might fail validation
      const result = await populatePool(
        repo,
        {
          templateId: testTemplateId,
          topicId: "integration-test-topic",
          difficulty: 5, // Higher difficulty might cause more failures
          count: 10,
        },
        context
      );

      // Should complete without throwing, even with failures
      expect(result.generated + result.failed).toBe(10);
    });
  });

  describe("Template correctness", () => {
    it("retrieves template with correct schema structure", async () => {
      const template = await repo.getTemplate(testTemplateId);

      expect(template).not.toBeNull();
      expect(template?.name).toBe("Integration Test Template");
      expect(template?.templateLatex).toBe("$a*x + $b = $c");
      expect(template?.parameterSchema).toHaveProperty("a");
      expect(template?.parameterSchema?.a.type).toBe("int");
      expect(template?.baseDifficulty).toBe(2);
    });
  });

  describe("Parameter randomization determinism", () => {
    const makeInput = (seed: string): GenerateProblemInput => ({
      templateId: testTemplateId,
      topicId: "integration-test-topic",
      difficultyLevel: 3,
      seed,
    });

    const parametersAreDifferent = (
      p1: Record<string, number> | null | undefined,
      p2: Record<string, number> | null | undefined
    ): boolean =>
      p1?.a !== p2?.a || p1?.b !== p2?.b;

    it("generates identical problems with same seed", async () => {
      const result1 = await generateProblem(repo, makeInput("deterministic-seed-123"), context);
      const result2 = await generateProblem(repo, makeInput("deterministic-seed-123"), context);

      expect(result1.problem?.parameters).toEqual(result2.problem?.parameters);
    });

    it("generates different problems with different seeds", async () => {
      const result1 = await generateProblem(repo, makeInput("seed-a"), context);
      const result2 = await generateProblem(repo, makeInput("seed-b"), context);

      expect(
        parametersAreDifferent(result1.problem?.parameters, result2.problem?.parameters)
      ).toBe(true);
    });
  });
});
