import {
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/modules/dashboard/validations/dashboard";

/**
 * Calculates duration between two timestamps in minutes.
 */
export function calculateSessionDurationMinutes(
  startedAt: string | null,
  completedAt: string | null
): number {
  if (!startedAt || !completedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationMinutes = (end - start) / (1000 * 60);
  return Math.max(0, durationMinutes);
}

/**
 * Aggregates raw practice session and attempt data into dashboard statistics.
 */
export function computeDashboardStats(
  sessions: { started_at: string; completed_at: string | null }[],
  attempts: { is_correct: boolean | null }[]
): DashboardStats {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed_at).length;

  const gradedAttempts = attempts.filter((a) => a.is_correct !== null);
  const totalAnswers = gradedAttempts.length;
  const correctAnswers = gradedAttempts.filter((a) => a.is_correct === true).length;
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : null;

  const _totalTimeMinutes = sessions.length > 0
    ? sessions.reduce((acc, s) => {
        return acc + calculateSessionDurationMinutes(s.started_at, s.completed_at);
      }, 0)
    : null;

  return {
    totalSessions,
    problemsSolved: completedSessions,
    accuracy,
    currentStreak: 0, // Placeholder until streak engine is implemented
    topicsMastered: 0, // Placeholder — requires dedicated topic completion query
    problemsSolvedDelta: null,
    accuracyDelta: null,
    currentStreakDelta: null,
    topicsMasteredDelta: null,
  };
}

/**
 * Maps raw practice sessions into formatted activity items.
 *
 * createdAt reflects when the relevant event occurred:
 * - Completed session: uses completed_at (when the work finished)
 * - In-progress session: falls back to created_at (when it started)
 *
 * This ensures the activity feed sorts and displays by the correct
 * event time rather than always anchoring to session start.
 */
export function mapActivityItems(
  sessions: {
    id: string;
    completed_at: string | null;
    created_at: string;
    topic_id: string | null;
    attempts?: { id: string; created_at: string }[];
  }[],
  limit: number
): ActivityItem[] {
  return sessions
    .map(
      (item): ActivityItem => {
        // Find the latest attempt to provide a "Continue" or "View" link
        const sortedAttempts = [...(item.attempts || [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastAttemptId = sortedAttempts[0]?.id;

        return {
          id: item.id,
          sessionId: item.id,
          type: item.completed_at
            ? ("session_completed" as const)
            : ("session_started" as const),
          description: item.completed_at
            ? "Completed practice session"
            : "Started practice session",
          createdAt: item.completed_at ?? item.created_at,
          metadata: { 
            topicId: item.topic_id,
            sessionId: item.id,
            attemptId: lastAttemptId
          },
        };
      }
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

/**
 * Groups sessions by date for progress chart visualization.
 * Computes the accuracy percentage for each day using the provided attempts data.
 */
export function aggregateProgressChart(
  sessions: { id: string; created_at: string; started_at: string; completed_at: string | null }[],
  attempts: { session_id: string; is_correct: boolean | null }[],
  days: number
): ProgressDataPoint[] {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const attemptsBySession = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    if (a.is_correct === null) continue; // skip ungraded
    const entry = attemptsBySession.get(a.session_id) ?? {
      total: 0,
      correct: 0,
    };
    entry.total += 1;
    if (a.is_correct === true) entry.correct += 1;
    attemptsBySession.set(a.session_id, entry);
  }

  const grouped = sessions
    .filter((s) => new Date(s.created_at) >= dateLimit)
    .reduce((acc: Record<string, ProgressDataPoint & { _totalAnswers: number; _correctAnswers: number }>, item) => {
      const date = new Date(item.created_at).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          sessionsCompleted: 0,
          accuracyPercent: null,
          minutesPracticed: 0,
          _totalAnswers: 0,
          _correctAnswers: 0,
        };
      }
      if (item.completed_at) {
        acc[date].sessionsCompleted += 1;
      }
      acc[date].minutesPracticed =
        (acc[date].minutesPracticed ?? 0) +
        calculateSessionDurationMinutes(item.started_at, item.completed_at);

      const sessionAttempts = attemptsBySession.get(item.id);
      if (sessionAttempts) {
        acc[date]._totalAnswers += sessionAttempts.total;
        acc[date]._correctAnswers += sessionAttempts.correct;
      }

      return acc;
    }, {});

  return Object.values(grouped)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ _totalAnswers, _correctAnswers, ...point }) => ({
      ...point,
      accuracyPercent:
        _totalAnswers > 0
          ? Math.round((_correctAnswers / _totalAnswers) * 100)
          : null,
    }));
}
