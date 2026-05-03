import { DashboardRepository } from '../repositories/dashboard-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { DashboardStats, ActivityItem, ProgressDataPoint } from '../validations/dashboard'

export async function prefetchDashboardStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ stats: DashboardStats; activity: ActivityItem[]; progressChart: ProgressDataPoint[] }> {
  const repository = new DashboardRepository(supabase)
  const [stats, activity, progressChart] = await Promise.all([
    repository.fetchDashboardStats(userId),
    repository.fetchRecentActivity(userId, 10),
    repository.fetchProgressChart(userId, 30),
  ])
  return { stats, activity, progressChart }
}
