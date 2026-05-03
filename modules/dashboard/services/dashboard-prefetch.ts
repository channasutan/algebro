import { createServerClient } from '@/lib/supabase/server'
import { DashboardRepository } from "../repositories/dashboard-repository";
import type {
  DashboardStats,
  ActivityItem,
  ProgressDataPoint,
} from "../validations/dashboard";

export async function prefetchDashboardStats(
  userId: string
): Promise<{
  stats: DashboardStats;
  activity: ActivityItem[];
  progressChart: ProgressDataPoint[];
}> {
  const supabase = await createServerClient()
  const repository = new DashboardRepository(supabase);


  const [stats, activity, progressChart] = await Promise.all([
    repository.fetchDashboardStats(userId),
    repository.fetchRecentActivity(userId, 10),
    repository.fetchProgressChart(userId, 30),
  ]);

  return { stats, activity, progressChart };
}
