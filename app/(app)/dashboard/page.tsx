import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { loadDashboardData } from '@/services/dashboard/dashboard.service'
// architecture-ok: app→lib
import { queryKeys } from '@/lib/queries/keys'
import { DashboardClient } from './client'

export const metadata = {
  title: 'Dashboard | Algebro',
}

export default async function DashboardPage() {
  const { user, stats, activity, progressChart } = await loadDashboardData()

  if (!user) {
    redirect('/sign-in')
  }

  const queryClient = new QueryClient()

  // Prefetch all dashboard data
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(user.id),
      queryFn: async () => stats,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.activity(user.id, 10),
      queryFn: async () => activity,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.progressChart(user.id, '30d'),
      queryFn: async () => progressChart,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient userId={user.id} />
    </HydrationBoundary>
  )
}
