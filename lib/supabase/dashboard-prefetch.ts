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
import {
  computeDashboardStats,
  mapActivityItems,
  aggregateProgressChart,
} from "@/lib/dashboard-utils";

export async function prefetchDashboardData(userId: string): Promise<{
  stats: DashboardStats;
  activity: ActivityItem[];
  progressChart: ProgressDataPoint[];
}> {
  const supabase = await getSupabaseServerClient();

  // Parallel fetch raw data
  const [sessionsRes, attemptsRes, progressRes] = await Promise.all([
    supabase.from("practice_sessions").select("id, started_at, completed_at, created_at, topic_id").eq("user_id", userId),
    supabase.from("attempts").select("is_correct").eq("user_id", userId),
    supabase.from("topic_progress").select("mastery_score").eq("user_id", userId).maybeSingle(),
  ]);

  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (attemptsRes.error) throw new Error(attemptsRes.error.message);
  if (progressRes.error) throw new Error(progressRes.error.message);

  const sessions = sessionsRes.data || [];
  const attempts = attemptsRes.data || [];
  const masteryScore = progressRes.data?.mastery_score;

  // Transform using shared pure helpers
  const stats = dashboardStatsSchema.parse(
    computeDashboardStats(sessions, attempts, masteryScore)
  );

  const activity = z.array(activityItemSchema).parse(
    mapActivityItems(sessions, 10)
  );

  const progressChart = z.array(progressDataPointSchema).parse(
    aggregateProgressChart(sessions, 30) // Default to 30d for prefetch
  );

  return { stats, activity, progressChart };
}
