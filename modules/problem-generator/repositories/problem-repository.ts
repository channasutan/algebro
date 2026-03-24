import type { ProblemTemplate } from "../domain/problem-template";
import type { GeneratedProblem } from "../domain/generated-problem";
import type { ProblemPoolEntry } from "../domain/problem-pool-entry";

/**
 * Repository interface for problem generator persistence.
 * Abstracts database operations for templates, problems, and pool entries.
 */
export interface ProblemRepository {
  /**
   * Fetch a single template by ID.
   * @returns Template or null if not found
   */
  getTemplate(templateId: string): Promise<ProblemTemplate | null>;

  /**
   * List all available templates.
   * @returns Array of templates
   */
  listTemplates(): Promise<ProblemTemplate[]>;

  /**
   * Save a generated problem to the database.
   * @returns Saved problem with generated ID
   */
  saveProblem(problem: GeneratedProblem): Promise<GeneratedProblem>;

  /**
   * Add a problem to the problem pool.
   * @returns Pool entry with generated ID
   */
  addToPool(entry: ProblemPoolEntry): Promise<ProblemPoolEntry>;

  /**
   * Get count of problems in pool, optionally filtered by topic.
   * @returns Count of pool entries
   */
  getPoolCount(topicId?: string): Promise<number>;
}
