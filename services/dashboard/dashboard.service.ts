import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { DashboardRepository } from '@/repositories/dashboard/dashboard-repository'

export async function loadDashboardData() {
  const supabase = await createServerClient()
  const repository = new DashboardRepository(supabase)
  
  const user = await repository.getAuthenticatedUser()
  
  if (!user) {
    return { user: null, stats: null, activity: null, progressChart: null }
  }

  const [stats, activity, progressChart] = await Promise.all([
    repository.fetchDashboardStats(user.id),
    repository.fetchRecentActivity(user.id, 10),
    repository.fetchProgressChart(user.id, 30),
  ])
  
  return {
    user,
    stats,
    activity,
    progressChart,
  }
}
