import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import {
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/lib/validations/dashboard";
import {
  fetchDashboardStats,
  fetchRecentActivity,
  fetchProgressChart,
} from "@/modules/dashboard/repositories/dashboard-repository";

export function useDashboardStats(userId: string) {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: () => fetchDashboardStats(userId),
    enabled: !!userId,
  });
}

export function useRecentActivity(userId: string, limit: number = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: queryKeys.dashboard.activity(userId, limit),
    queryFn: () => fetchRecentActivity(userId, limit),
    enabled: !!userId,
  });
}

export function useProgressChart(
  userId: string,
  range: "7d" | "30d" | "90d"
) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  return useQuery<ProgressDataPoint[]>({
    queryKey: queryKeys.dashboard.progressChart(userId, range),
    queryFn: () => fetchProgressChart(userId, days),
    enabled: !!userId,
  });
}
