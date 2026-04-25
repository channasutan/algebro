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
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

interface MathSession {
  id: string;
  status: string;
  duration: number | null;
  created_at: string;
  user_id: string;
}

interface SessionAnswer {
  is_correct: boolean;
  user_id: string;
}

interface UserProgress {
  current_streak: number;
  user_id: string;
}

type SupabaseWithDashboard = SupabaseClient<
  Database & {
    public: {
      Tables: Database["public"]["Tables"] & {
        math_sessions: { Row: MathSession; Insert: unknown; Update: unknown; Relationships: [] };
        session_answers: { Row: SessionAnswer; Insert: unknown; Update: unknown; Relationships: [] };
        user_progress: { Row: UserProgress; Insert: unknown; Update: unknown; Relationships: [] };
      };
    };
  }
>;

export function useDashboardStats(userId: string) {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient() as unknown as SupabaseWithDashboard;

      // TODO: Table 'math_sessions' not found in schema — verify with backend
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("math_sessions")
        .select("id, status, duration")
        .eq("user_id", userId);

      if (sessionsError) throw new Error(sessionsError.message);

      // TODO: Table 'session_answers' not found in schema — verify with backend
      const { data: answersData, error: answersError } = await supabase
        .from("session_answers")
        .select("is_correct")
        .eq("user_id", userId);

      if (answersError) throw new Error(answersError.message);

      const sessions = (sessionsData as unknown as MathSession[]) || [];
      const answers = (answersData as unknown as SessionAnswer[]) || [];

      const totalSessions = sessions.length;
      const completedSessions =
        sessions.filter((s) => s.status === "completed").length;

      const totalAnswers = answers.length;
      const correctAnswers = answers.filter((a) => a.is_correct).length;
      const accuracy =
        totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : null;

      // TODO: Table 'user_progress' not found in schema — verify with backend
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("current_streak")
        .eq("user_id", userId)
        .single();

      const currentStreak = progressData
        ? Number((progressData as unknown as UserProgress).current_streak)
        : 0;

      const totalTimeMinutes =
        sessions.reduce((acc, s) => acc + (s.duration || 0), 0) || null;

      const rawData = {
        totalSessions,
        completedSessions,
        accuracy,
        currentStreak,
        totalTimeMinutes,
      };

      return dashboardStatsSchema.parse(rawData);
    },
    enabled: !!userId,
  });
}

export function useRecentActivity(userId: string, limit: number = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: queryKeys.dashboard.activity(userId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient() as unknown as SupabaseWithDashboard;

      // TODO: Table 'math_sessions' not found in schema — verify with backend
      // Fetching raw data and formatting it as ActivityItems
      const { data, error } = await supabase
        .from("math_sessions")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const sessions = (data as unknown as MathSession[]) || [];

      const rawItems = sessions.map((item) => ({
        id: item.id,
        sessionId: item.id,
        type: "session_completed", // simplified for now
        description: `Session ${item.status}`,
        createdAt: item.created_at,
        metadata: null,
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
      const supabase = getSupabaseBrowserClient() as unknown as SupabaseWithDashboard;

      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // TODO: Table 'math_sessions' not found in schema — verify with backend
      const { data, error } = await supabase
        .from("math_sessions")
        .select("created_at, status, duration")
        .eq("user_id", userId)
        .gte("created_at", dateLimit.toISOString());

      if (error) throw new Error(error.message);

      const sessions = (data as unknown as MathSession[]) || [];

      // Group by date
      const grouped = sessions.reduce((acc: Record<string, ProgressDataPoint>, item) => {
        const date = new Date(item.created_at).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            sessionsCompleted: 0,
            accuracyPercent: null, // missing answer link
            minutesPracticed: 0,
          };
        }
        if (item.status === "completed") {
          acc[date].sessionsCompleted += 1;
        }
        acc[date].minutesPracticed = (acc[date].minutesPracticed || 0) + (item.duration || 0);
        return acc;
      }, {});

      return z.array(progressDataPointSchema).parse(Object.values(grouped));
    },
    enabled: !!userId,
  });
}
