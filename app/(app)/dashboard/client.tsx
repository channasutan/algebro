'use client'

import dynamic from 'next/dynamic'
import type { AccuracyDataPoint } from '@/modules/dashboard/types/accuracy-chart'

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



const AccuracyChart = dynamic(
  () =>
    import('@/components/features/dashboard/accuracy-chart').then((mod) => ({ default: mod.AccuracyChart })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
    ),
  }
)

const MOCK_ACCURACY_DATA: AccuracyDataPoint[] = [
  { day: 'Mon', accuracy: 72 },
  { day: 'Tue', accuracy: 85 },
  { day: 'Wed', accuracy: 68 },
  { day: 'Thu', accuracy: 91 },
  { day: 'Fri', accuracy: 78 },
  { day: 'Sat', accuracy: 88 },
  { day: 'Sun', accuracy: 94 },
]

// ─── ProgressSection ─────────────────────────────────────────────────────
function ProgressSection({ userId }: Readonly<{ userId: string }>) {
  const { data, isLoading, isError } = useProgressChart(userId, '30d')

  if (isError) return <SectionError message="Could not load progress chart." />
  return (
    <div className="flex flex-col gap-6">
      <ProgressChart data={data} isLoading={isLoading} />
      {/* TODO FRO-54: Replace with real data from useDashboardStats or query */}
      <AccuracyChart data={MOCK_ACCURACY_DATA} />
    </div>
  )
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
