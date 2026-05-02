import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import {
  fetchDashboardStats,
  fetchRecentActivity,
  fetchProgressChart,
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from "@/modules/dashboard";

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

const RANGE_TO_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function useProgressChart(
  userId: string,
  range: "7d" | "30d" | "90d"
) {
  const days = RANGE_TO_DAYS[range];

  return useQuery<ProgressDataPoint[]>({
    queryKey: queryKeys.dashboard.progressChart(userId, range),
    queryFn: () => fetchProgressChart(userId, days),
    enabled: !!userId,
  });
}
