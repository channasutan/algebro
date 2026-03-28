import { calculateMasteryScore, type AttemptHistory } from "../domain/mastery";
import type { CurriculumRepository } from "../repositories/curriculum-repository";
import type { UpdateMasteryInput, UpdateMasteryOutput } from "../contracts/update-mastery";

export async function updateMastery(
  input: UpdateMasteryInput & { attemptId: string; completedAt: Date },
  repo: CurriculumRepository
): Promise<UpdateMasteryOutput> {
  const { userId, topicId, attemptResult } = input;

  // 1. Get existing progress for EMA blend
  const existingProgress = await repo.getTopicProgress(userId, topicId);
  const previousScore = existingProgress?.masteryScore ?? 0;

  // 2. Build attempt history from this attempt only.
  //    Phase 7+: replace with full history query from Practice Engine.
  //    See: https://github.com/channasutan/algebro/issues/<PHASE7_ISSUE>
  const history: AttemptHistory[] = [
    { attemptId: input.attemptId, result: attemptResult, completedAt: input.completedAt },
  ];

  // 3. Calculate single-attempt score, then blend with history via EMA.
  //    ALPHA = 0.3 means new attempt weighs 30%, accumulated history weighs 70%.
  //    Phase 7 migration: replace EMA with calculateMasteryScore(fullHistory).
  //    Tracked: https://github.com/channasutan/algebro/issues/61
  const singleAttemptScore = calculateMasteryScore(history);
  const ALPHA = 0.3;
  const masteryScore =
    previousScore === 0
      ? singleAttemptScore // first attempt: no prior history to blend
      : Math.round((previousScore * (1 - ALPHA) + singleAttemptScore * ALPHA) * 100) / 100;

  // 4. Persist via repository — service-role write (bypasses RLS)
  await repo.upsertTopicProgress(userId, topicId, masteryScore);

  return { masteryScore, previousScore };
}
