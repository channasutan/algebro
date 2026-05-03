import 'server-only'
import { prefetchDashboardStats } from '@/modules/dashboard/index.server'
import { getAuthenticatedUser } from '@/modules/dashboard/index.server'

export async function loadDashboardData() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return { user: null, stats: null, activity: null, progressChart: null }
  }

  const data = await prefetchDashboardStats(user.id)
  
  return {
    user,
    ...data
  }
}
