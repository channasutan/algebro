import { HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { loadDashboardPage } from '@/loaders/dashboard-loader'
import { DashboardClient } from './client'

export const metadata = {
  title: 'Dashboard | Algebro',
}

export default async function DashboardPage() {
  const { user, dehydratedState } = await loadDashboardPage()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <HydrationBoundary state={dehydratedState}>
      <DashboardClient userId={user.id} />
    </HydrationBoundary>
  )
}
