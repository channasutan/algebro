import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '../services/dashboard-auth'
import { prefetchDashboardStats } from '../services/dashboard-prefetch'

export async function loadDashboardData() {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)
  
  if (!user) {
    return { user: null, stats: null, activity: null, progressChart: null }
  }

  const data = await prefetchDashboardStats(supabase, user.id)
  
  return {
    user,
    ...data
  }
}
