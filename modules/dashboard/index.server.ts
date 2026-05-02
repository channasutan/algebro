import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server-client'
import { DashboardRepository } from './repositories/dashboard-repository'

export { DashboardRepository }
export type { DashboardStats, ActivityItem, ProgressDataPoint } from './validations/dashboard'

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function prefetchDashboard(userId: string) {
  const supabase = await getSupabaseServerClient()
  const { prefetchDashboardData } = await import('./services/dashboard-prefetch')
  return prefetchDashboardData(supabase, userId)
}
