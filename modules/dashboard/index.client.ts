import 'client-only'
export {
  useDashboardStats,
  useRecentActivity,
  useProgressChart as useDashboardProgressChart
} from './hooks/use-dashboard-query'
export type { DashboardStats, ActivityItem, ProgressDataPoint } from './validations/dashboard'

// Also export the fetchers for manual use if needed
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import { DashboardRepository } from './repositories/dashboard-repository'

export async function fetchDashboardStats(userId: string) {
  const supabase = getSupabaseBrowserClient()
  const repo = new DashboardRepository(supabase)
  return repo.fetchDashboardStats(userId)
}

export async function fetchRecentActivity(userId: string, limit: number) {
  const supabase = getSupabaseBrowserClient()
  const repo = new DashboardRepository(supabase)
  return repo.fetchRecentActivity(userId, limit)
}

export async function fetchProgressChart(userId: string, days: number) {
  const supabase = getSupabaseBrowserClient()
  const repo = new DashboardRepository(supabase)
  return repo.fetchProgressChart(userId, days)
}
