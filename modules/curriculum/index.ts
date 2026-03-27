// Public API — curriculum module
// Only expose what other modules need
// Do NOT import directly from internal paths

export { getRecommendedProblem } from "./services/get-recommended-problem";
export { updateMastery } from "./services/update-mastery";
export { calculateMasteryScore } from "./domain/mastery";

// Type exports for consumers
export { type GetRecommendedProblemInput, type GetRecommendedProblemOutput } from "./contracts/get-recommended-problem";
export { type UpdateMasteryInput, type UpdateMasteryOutput } from "./contracts/update-mastery";
export { type TopicMastery, type AttemptHistory } from "./domain/mastery";
export { validateMasteryScore, assertMasteryScore } from "./domain/mastery-invariants";


export const curriculumModule = {
  name: "curriculum",
} as const;
