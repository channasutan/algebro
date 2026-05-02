import { dehydrate, type DehydratedState } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/queries/keys'
import { type User } from '@supabase/supabase-js'
import {
  getAuthenticatedUser,
  prefetchDashboardStats,
} from '@/modules/dashboard'

export async function loadDashboardPage(): Promise<{ user: User | null; dehydratedState: DehydratedState }> {
  const user = await getAuthenticatedUser()

  const queryClient = getQueryClient()

  if (user) {
    try {
      const data = await prefetchDashboardStats(user.id)
      queryClient.setQueryData(queryKeys.dashboard.stats(user.id), data.stats)
      queryClient.setQueryData(queryKeys.dashboard.activity(user.id, 10), data.activity)
      queryClient.setQueryData(
        queryKeys.dashboard.progressChart(user.id, '30d'),
        data.progressChart,
      )
    } catch (error) {
      console.error('Failed to prefetch dashboard data:', error)
    }
  }

  return { user, dehydratedState: dehydrate(queryClient) }
}
