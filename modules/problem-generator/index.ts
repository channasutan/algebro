export { generateProblem } from "./services/generate-problem";
export { populatePool } from "./services/populate-problem-pool";
export type { GenerateProblemInput, GenerateProblemResult } from "./contracts/generation";
export type { ProblemTemplate, GeneratedProblem, ProblemPoolEntry, ParameterSchema } from "./domain";
export const problemGeneratorModule = { name: "problem-generator" } as const;
