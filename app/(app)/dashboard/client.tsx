'use client'

import {
  PageContainer,
  PageContainerHeader,
  PageContainerHeading,
  PageContainerContent,
} from '@/components/ui/page-container'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { QuickActions } from '@/components/dashboard/quick-actions'

import {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
} from '@/lib/queries'

export function DashboardClient({ userId }: Readonly<{ userId: string }>) {
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useDashboardStats(userId)

  const {
    data: activity,
    isLoading: isActivityLoading,
    isError: isActivityError,
    refetch: refetchActivity,
  } = useRecentActivity(userId, 10)

  const {
    data: progressChart,
    isLoading: isChartLoading,
    isError: isChartError,
    refetch: refetchChart,
  } = useProgressChart(userId, '30d')

  // Find the most recently active topic that has an ID.
  // The first item in activity is the most recent.
  const lastTopicId = activity && activity.length > 0 ? (activity[0].metadata?.topicId as string | undefined) : null

  const hasError = isStatsError || isActivityError || isChartError

  function handleRetry() {
    if (isStatsError) void refetchStats()
    if (isActivityError) void refetchActivity()
    if (isChartError) void refetchChart()
  }

  const isAnyLoading = isStatsLoading || isActivityLoading || isChartLoading

  if (hasError && !isAnyLoading) {
    return (
      <PageContainer>
        <PageContainerHeader>
          <PageContainerHeading>Dashboard</PageContainerHeading>
        </PageContainerHeader>
        <PageContainerContent>
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-sm text-[--color-text-muted]">
              Something went wrong loading your dashboard.
            </p>
            <button
              onClick={handleRetry}
              className="rounded-md bg-[--color-primary] px-4 py-2 text-sm font-medium text-[--color-text-inverse] transition hover:bg-[--color-primary-hover]"
            >
              Try again
            </button>
          </div>
        </PageContainerContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageContainerHeader>
        <PageContainerHeading>Dashboard</PageContainerHeading>
      </PageContainerHeader>
      <PageContainerContent className="space-y-6">
        <KPICards stats={stats} isLoading={isStatsLoading} />

        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4 xl:col-span-5">
            <ProgressChart data={progressChart} isLoading={isChartLoading} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-3 xl:col-span-2">
            <QuickActions lastTopicId={lastTopicId} isLoading={isActivityLoading} />
            <RecentActivity activity={activity} isLoading={isActivityLoading} />
          </div>
        </div>
      </PageContainerContent>
    </PageContainer>
  )
}
