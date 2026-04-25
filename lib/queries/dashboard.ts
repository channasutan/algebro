import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { queryKeys } from "./keys";
import {
  dashboardStatsSchema,
  activityItemSchema,
  progressDataPointSchema,
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/lib/validations/dashboard";
import { z } from "zod";

export function useDashboardStats(userId: string) {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      // Fetch practice sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("practice_sessions")
        .select("id, completed_at, started_at")
        .eq("user_id", userId);

      if (sessionsError) throw new Error(sessionsError.message);

      // Fetch attempts for accuracy calculation
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
      const accuracy =
        totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : null;

      // Fetch topic progress for streak
      // Note: This assumes topic_progress contains a current_streak or we aggregate it.
      // Based on schema, topic_progress has mastery_score. Aggregating streak from sessions might be more accurate.
      // For now, let's look for a user-level progress or calculate from sessions.
      const { data: progressData, error: progressError } = await supabase
        .from("topic_progress")
        .select("mastery_score")
        .eq("user_id", userId)
        .maybeSingle();

      if (progressError) throw new Error(progressError.message);

      // Simple duration calculation: sum of (completed_at - started_at) in minutes
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

      const rawData = {
        totalSessions,
        completedSessions,
        accuracy,
        currentStreak: 0, // Placeholder: need logic to calculate streak from sessions
        totalTimeMinutes: totalTimeMinutes > 0 ? totalTimeMinutes : null,
      };

      return dashboardStatsSchema.parse(rawData);
    },
    enabled: !!userId,
  });
}

export function useRecentActivity(userId: string, limit: number = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: queryKeys.dashboard.activity(userId, limit),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from("practice_sessions")
        .select("id, completed_at, created_at, topic_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const rawItems = (data || []).map((item) => ({
        id: item.id,
        sessionId: item.id,
        type: "session_completed",
        description: item.completed_at ? "Completed practice session" : "Started practice session",
        createdAt: item.created_at,
        metadata: { topicId: item.topic_id },
      }));

      return z.array(activityItemSchema).parse(rawItems);
    },
    enabled: !!userId,
  });
}

export function useProgressChart(
  userId: string,
  range: "7d" | "30d" | "90d"
) {
  return useQuery<ProgressDataPoint[]>({
    queryKey: queryKeys.dashboard.progressChart(userId, range),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      const { data, error } = await supabase
        .from("practice_sessions")
        .select("created_at, completed_at, started_at")
        .eq("user_id", userId)
        .gte("created_at", dateLimit.toISOString());

      if (error) throw new Error(error.message);

      const sessions = data || [];

      // Group by date
      const grouped = sessions.reduce((acc: Record<string, ProgressDataPoint>, item) => {
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

      // Sort by date ascending before returning
      const sortedData = Object.values(grouped).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      return z.array(progressDataPointSchema).parse(sortedData);
    },
    enabled: !!userId,
  });
}
