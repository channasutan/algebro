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
  const [sessionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("id, started_at, completed_at, created_at, topic_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("attempts").select("is_correct, session_id").eq("user_id", userId),
  ]);

  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (attemptsRes.error) throw new Error(attemptsRes.error.message);

  const sessions = sessionsRes.data ?? [];
  const attempts = attemptsRes.data ?? [];

  // Transform using shared pure helpers
  const stats = dashboardStatsSchema.parse(
    computeDashboardStats(sessions, attempts)
  );

  // sessions already ordered desc — mapActivityItems slices first 10 correctly
  const activity = z.array(activityItemSchema).parse(
    mapActivityItems(sessions, 10)
  );

  const progressChart = z.array(progressDataPointSchema).parse(
    aggregateProgressChart(sessions, attempts, 30) // Default to 30d for prefetch
  );

  return { stats, activity, progressChart };
}
