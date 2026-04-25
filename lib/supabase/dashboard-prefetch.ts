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

export async function prefetchDashboardData(userId: string): Promise<{
  stats: DashboardStats;
  activity: ActivityItem[];
  progressChart: ProgressDataPoint[];
}> {
  const supabase = (await getSupabaseServerClient()) as unknown as SupabaseWithDashboard;

  // 1. Stats Data
  // TODO: Table 'math_sessions' not found in schema — verify with backend
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("math_sessions")
    .select("id, status, duration, created_at")
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
  const completedSessions = sessions.filter((s) => s.status === "completed").length;

  const totalAnswers = answers.length;
  const correctAnswers = answers.filter((a) => a.is_correct).length;
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : null;

  // TODO: Table 'user_progress' not found in schema — verify with backend
  const { data: progressData } = await supabase
    .from("user_progress")
    .select("current_streak")
    .eq("user_id", userId)
    .single();

  const currentStreak = progressData
    ? Number((progressData as unknown as UserProgress).current_streak)
    : 0;
  const totalTimeMinutes = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) || null;

  const rawStats = {
    totalSessions,
    completedSessions,
    accuracy,
    currentStreak,
    totalTimeMinutes,
  };

  const stats = dashboardStatsSchema.parse(rawStats);

  // 2. Activity Data
  const rawActivity = [...sessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      sessionId: item.id,
      type: "session_completed",
      description: `Session ${item.status}`,
      createdAt: item.created_at,
      metadata: null,
    }));

  const activity = z.array(activityItemSchema).parse(rawActivity);

  // 3. Progress Chart Data
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 30); // Defaulting to 30d for prefetch

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
      if (item.status === "completed") {
        acc[date].sessionsCompleted += 1;
      }
      acc[date].minutesPracticed = (acc[date].minutesPracticed || 0) + (item.duration || 0);
      return acc;
    }, {});

  const progressChart = z.array(progressDataPointSchema).parse(Object.values(grouped));

  return { stats, activity, progressChart };
}
