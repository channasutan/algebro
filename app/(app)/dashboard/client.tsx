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

// ✅ hooks/ layer — not lib/ directly
import {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
} from '@/hooks/use-dashboard'

// ─── SectionError (shared inline fallback) ───────────────────────────────
function SectionError({ message }: Readonly<{ message: string }>) {
  return (
    <div
      role="alert"
      className="flex items-center justify-center h-32 rounded-lg
                 border border-[--color-error]/20 bg-[--color-error-highlight]
                 text-[--color-error] text-sm"
    >
      <p>{message}</p>
    </div>
  )
}

// ─── StatsSection ────────────────────────────────────────────────────────
function StatsSection({ userId }: Readonly<{ userId: string }>) {
  const { data, isLoading, isError } = useDashboardStats(userId)

  if (isError) return <SectionError message="Could not load stats." />
  return <KPICards stats={data} isLoading={isLoading} />
}

// ─── ProgressSection ─────────────────────────────────────────────────────
function ProgressSection({ userId }: Readonly<{ userId: string }>) {
  const { data, isLoading, isError } = useProgressChart(userId, '30d')

  if (isError) return <SectionError message="Could not load progress chart." />
  return <ProgressChart data={data} isLoading={isLoading} />
}

// ─── ActivitySection ─────────────────────────────────────────────────────
function ActivitySection({ userId }: Readonly<{ userId: string }>) {
  const { data, isLoading, isError } = useRecentActivity(userId, 10)

  if (isError) return <SectionError message="Could not load recent activity." />

  const lastActivity = data?.[0]
  const lastSessionId = lastActivity?.metadata?.sessionId as string | undefined
  const lastAttemptId = lastActivity?.metadata?.attemptId as string | undefined

  return (
    <div className="flex flex-col gap-6">
      <QuickActions 
        lastSessionId={lastSessionId} 
        lastAttemptId={lastAttemptId} 
        isLoading={isLoading} 
      />
      <RecentActivity activity={data} isLoading={isLoading} />
    </div>
  )
}

// ─── Root client component ────────────────────────────────────────────────
export function DashboardClient({ userId }: Readonly<{ userId: string }>) {
  return (
    <PageContainer>
      <PageContainerHeader>
        <PageContainerHeading>Dashboard</PageContainerHeading>
      </PageContainerHeader>
      <PageContainerContent className="space-y-6">
        <StatsSection userId={userId} />

        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4 xl:col-span-5">
            <ProgressSection userId={userId} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-3 xl:col-span-2">
            <ActivitySection userId={userId} />
          </div>
        </div>
      </PageContainerContent>
    </PageContainer>
  )
}
