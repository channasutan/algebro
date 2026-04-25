import {
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/lib/validations/dashboard";

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
  return durationMinutes > 0 ? durationMinutes : 0;
}

/**
 * Aggregates raw practice session and attempt data into dashboard statistics.
 */
export function computeDashboardStats(
  sessions: { started_at: string; completed_at: string | null }[],
  attempts: { is_correct: boolean | null }[],
  masteryScore: number = 0
): DashboardStats {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed_at).length;

  const totalAnswers = attempts.length;
  const correctAnswers = attempts.filter((a) => a.is_correct).length;
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : null;

  const totalTimeMinutes = sessions.reduce((acc, s) => {
    return acc + calculateSessionDurationMinutes(s.started_at, s.completed_at);
  }, 0);

  return {
    totalSessions,
    completedSessions,
    accuracy,
    currentStreak: 0, // Placeholder until streak engine is implemented
    totalTimeMinutes: totalTimeMinutes > 0 ? totalTimeMinutes : null,
  };
}

/**
 * Maps raw practice sessions into formatted activity items.
 */
export function mapActivityItems(
  sessions: { id: string; completed_at: string | null; created_at: string; topic_id: string | null }[],
  limit: number
): ActivityItem[] {
  return sessions.slice(0, limit).map((item) => ({
    id: item.id,
    sessionId: item.id,
    type: "session_completed",
    description: item.completed_at ? "Completed practice session" : "Started practice session",
    createdAt: item.created_at,
    metadata: { topicId: item.topic_id },
  }));
}

/**
 * Groups sessions by date for progress chart visualization.
 */
export function aggregateProgressChart(
  sessions: { created_at: string; started_at: string; completed_at: string | null }[],
  days: number
): ProgressDataPoint[] {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const grouped = sessions
    .filter((s) => new Date(s.created_at) >= dateLimit)
    .reduce((acc: Record<string, ProgressDataPoint>, item) => {
      const date = new Date(item.created_at).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          sessionsCompleted: 0,
          accuracyPercent: null,
          minutesPracticed: 0,
        };
      }
      if (item.completed_at) {
        acc[date].sessionsCompleted += 1;
      }
      acc[date].minutesPracticed =
        (acc[date].minutesPracticed ?? 0) +
        calculateSessionDurationMinutes(item.started_at, item.completed_at);
      return acc;
    }, {});

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}
