import { calculateMasteryScore, type AttemptHistory } from "../domain/mastery";
import type { CurriculumRepository } from "../repositories/supabase-curriculum-repository";
import type { UpdateMasteryInput, UpdateMasteryOutput } from "../contracts/update-mastery";

export async function updateMastery(
  input: UpdateMasteryInput & { attemptId: string; completedAt: Date },
  repo: CurriculumRepository
): Promise<UpdateMasteryOutput> {
  const { userId, topicId, attemptResult } = input;

  // 1. Get current progress for previousScore reporting only
  const current = await repo.getTopicProgress(userId, topicId);
  const previousScore = current?.masteryScore ?? 0;

  // 2. Build attempt history from this attempt only.
  //    Phase 7+ will query full attempt history from Practice Engine
  //    and pass the real array here. No synthetic attempts are injected
  //    to avoid corrupting mastery trends.
  const history: AttemptHistory[] = [
    { attemptId: input.attemptId, result: attemptResult, completedAt: input.completedAt },
  ];

  // 3. Calculate new mastery score via domain pure function (time-decay weighted)
  const masteryScore = calculateMasteryScore(history);

  // 4. Persist via repository — service-role write (bypasses RLS)
  await repo.upsertTopicProgress(userId, topicId, masteryScore);

  return { masteryScore, previousScore };
}
