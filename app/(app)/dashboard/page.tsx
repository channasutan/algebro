import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { prefetchDashboardData } from '@/lib/supabase/dashboard-prefetch'
import { getSupabaseServerClient } from '@/lib/supabase/server-client'
import { queryKeys } from '@/lib/queries/keys'
import { DashboardClient } from './client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Dashboard | Algebro',
}

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  const queryClient = getQueryClient()
  
  try {
    const data = await prefetchDashboardData(user.id)
    
    // Seed the query cache with prefetched data
    queryClient.setQueryData(queryKeys.dashboard.stats(user.id), data.stats)
    queryClient.setQueryData(queryKeys.dashboard.activity(user.id, 10), data.activity)
    queryClient.setQueryData(queryKeys.dashboard.progressChart(user.id, '30d'), data.progressChart)
  } catch (error) {
    console.error('Failed to prefetch dashboard data:', error)
    // We don't fail the page load if prefetch fails, the client will retry
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient userId={user.id} />
    </HydrationBoundary>
  )
}
