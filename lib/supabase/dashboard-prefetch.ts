import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { z } from "zod";
import {
  dashboardStatsSchema,
  activityItemSchema,
  progressDataPointSchema,
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/lib/validations/dashboard";

export async function prefetchDashboardData(userId: string): Promise<{
  stats: DashboardStats;
  activity: ActivityItem[];
  progressChart: ProgressDataPoint[];
}> {
  const supabase = await getSupabaseServerClient();

  // 1. Stats Data
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("practice_sessions")
    .select("id, completed_at, started_at, created_at, topic_id")
    .eq("user_id", userId);

  if (sessionsError) throw new Error(sessionsError.message);

  const { data: attemptsData, error: attemptsError } = await supabase
    .from("attempts")
    .select("is_correct")
    .eq("user_id", userId);

  if (attemptsError) throw new Error(attemptsError.message);

  const sessions = sessionsData || [];
  const attempts = attemptsData || [];

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed_at).length;

  const totalAnswers = attempts.length;
  const correctAnswers = attempts.filter((a) => a.is_correct).length;
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : null;

  // Streak logic (placeholder)
  const currentStreak = 0;

  const totalTimeMinutes = sessions.reduce((acc, s) => {
    if (s.started_at && s.completed_at) {
      const duration =
        (new Date(s.completed_at).getTime() -
          new Date(s.started_at).getTime()) /
        (1000 * 60);
      return acc + duration;
    }
    return acc;
  }, 0);

  const stats = dashboardStatsSchema.parse({
    totalSessions,
    completedSessions,
    accuracy,
    currentStreak,
    totalTimeMinutes: totalTimeMinutes > 0 ? totalTimeMinutes : null,
  });

  // 2. Activity Data
  const rawActivity = [...sessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      sessionId: item.id,
      type: "session_completed",
      description: item.completed_at ? "Completed practice session" : "Started practice session",
      createdAt: item.created_at,
      metadata: { topicId: item.topic_id },
    }));

  const activity = z.array(activityItemSchema).parse(rawActivity);

  // 3. Progress Chart Data
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 30); // Default to 30d for prefetch

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
      if (item.started_at && item.completed_at) {
        const duration =
          (new Date(item.completed_at).getTime() -
            new Date(item.started_at).getTime()) /
          (1000 * 60);
        acc[date].minutesPracticed = (acc[date].minutesPracticed ?? 0) + duration;
      }
      return acc;
    }, {});

  const sortedProgressData = Object.values(grouped).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const progressChart = z.array(progressDataPointSchema).parse(sortedProgressData);

  return { stats, activity, progressChart };
}
