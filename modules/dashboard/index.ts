// Public API — lib/ MUST only import from this file, never from internals
import { getSupabaseServerClient } from '@/lib/supabase/server-client'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client'
import * as repo from './repositories/dashboard-repository'

export type { DashboardStats, ActivityItem, ProgressDataPoint }
  from '@/modules/dashboard/validations/dashboard'

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerClient()
  return repo.getAuthenticatedUser(supabase)
}

export async function prefetchDashboard(userId: string) {
  const supabase = await getSupabaseServerClient()
  return repo.prefetchDashboard(supabase, userId)
}

export async function fetchDashboardStats(userId: string) {
  const supabase = getSupabaseBrowserClient()
  return repo.fetchDashboardStats(supabase, userId)
}

export async function fetchRecentActivity(userId: string, limit: number) {
  const supabase = getSupabaseBrowserClient()
  return repo.fetchRecentActivity(supabase, userId, limit)
}

export async function fetchProgressChart(userId: string, days: number) {
  const supabase = getSupabaseBrowserClient()
  return repo.fetchProgressChart(supabase, userId, days)
}
