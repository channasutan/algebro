import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { prefetchDashboardData } from "@/lib/supabase/dashboard-prefetch";
import {
  computeDashboardStats,
  mapActivityItems,
  aggregateProgressChart,
} from "@/lib/dashboard-utils";
import {
  dashboardStatsSchema,
  activityItemSchema,
  progressDataPointSchema,
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/lib/validations/dashboard";
import { z } from "zod";
import { type User } from "@supabase/supabase-js";

// ─── Server-side (loader / RSC) ─────────────────────────────────────────────

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function prefetchDashboard(userId: string): Promise<{
  stats: DashboardStats;
  activity: ActivityItem[];
  progressChart: ProgressDataPoint[];
}> {
  return prefetchDashboardData(userId);
}

// ─── Client-side (TanStack Query) ──────────────────────────────────────────

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = getSupabaseBrowserClient();

  const [sessionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("id, started_at, completed_at")
      .eq("user_id", userId),
    supabase.from("attempts").select("is_correct").eq("user_id", userId),
  ]);

  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (attemptsRes.error) throw new Error(attemptsRes.error.message);

  const rawStats = computeDashboardStats(
    sessionsRes.data ?? [],
    attemptsRes.data ?? []
  );

  return dashboardStatsSchema.parse(rawStats);
}

export async function fetchRecentActivity(
  userId: string,
  limit: number
): Promise<ActivityItem[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("id, completed_at, created_at, topic_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rawItems = mapActivityItems(data ?? [], limit);
  return z.array(activityItemSchema).parse(rawItems);
}

export async function fetchProgressChart(
  userId: string,
  days: number
): Promise<ProgressDataPoint[]> {
  const supabase = getSupabaseBrowserClient();

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);

  const [sessionsRes, attemptsRes] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("id, created_at, started_at, completed_at")
      .eq("user_id", userId)
      .gte("created_at", dateLimit.toISOString()),
    supabase
      .from("attempts")
      .select("session_id, is_correct")
      .eq("user_id", userId)
      .gte("created_at", dateLimit.toISOString()),
  ]);

  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (attemptsRes.error) throw new Error(attemptsRes.error.message);

  const rawPoints = aggregateProgressChart(
    sessionsRes.data ?? [],
    attemptsRes.data ?? [],
    days
  );
  return z.array(progressDataPointSchema).parse(rawPoints);
}
