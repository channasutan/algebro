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
import {
  computeDashboardStats,
  mapActivityItems,
  aggregateProgressChart,
} from "@/lib/dashboard-utils";

export function useDashboardStats(userId: string) {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();

      const [sessionsRes, attemptsRes, progressRes] = await Promise.all([
        supabase
          .from("practice_sessions")
          .select("id, started_at, completed_at")
          .eq("user_id", userId),
        supabase.from("attempts").select("is_correct").eq("user_id", userId),
        supabase
          .from("topic_progress")
          .select("mastery_score")
          .eq("user_id", userId), // returns array, not maybeSingle
      ]);

      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (attemptsRes.error) throw new Error(attemptsRes.error.message);
      // topic_progress failure is non-fatal: computeDashboardStats does not
      // currently emit masteryScore in DashboardStats, so degrade gracefully
      // rather than taking down the whole stats query.
      const progressRows = progressRes.error ? [] : (progressRes.data ?? []);
      const masteryScore =
        progressRows.length > 0
          ? progressRows.reduce(
              (sum, r) => sum + (r.mastery_score ?? 0),
              0
            ) / progressRows.length
          : 0;

      const rawStats = computeDashboardStats(
        sessionsRes.data ?? [],
        attemptsRes.data ?? [],
        masteryScore
      );

      return dashboardStatsSchema.parse(rawStats);
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

      const rawItems = mapActivityItems(data ?? [], limit);
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
    },
    enabled: !!userId,
  });
}
