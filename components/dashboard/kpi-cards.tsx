'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { BookOpen, Target, Flame, Trophy } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KPICardsProps {
  readonly stats?: Readonly<{
    problemsSolved: number
    accuracy: number | null
    currentStreak: number
    topicsMastered: number
    problemsSolvedDelta: number | null
    accuracyDelta: number | null
    currentStreakDelta: number | null
    topicsMasteredDelta: number | null
  }>
  readonly isLoading?: boolean
}

interface CountUpProps {
  readonly value: number
  readonly suffix?: string
  readonly decimals?: number
}

const KPI_SKELETON_KEYS = ['kpi-sk-problems', 'kpi-sk-accuracy', 'kpi-sk-streak', 'kpi-sk-topics'] as const

function CountUp({ value, suffix = '', decimals = 0 }: CountUpProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    return latest.toFixed(decimals) + suffix
  })

  React.useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: 'easeOut' })
    return controls.stop
  }, [count, value])

  return <motion.span>{rounded}</motion.span>
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-[--color-text-subtle]">—</span>
  }
  const isPositive = value > 0
  const isNegative = value < 0
  return (
    <span
      className={cn(
        'text-xs font-medium',
        isPositive && 'text-[--color-success]',
        isNegative && 'text-[--color-error]',
        !isPositive && !isNegative && 'text-[--color-text-subtle]'
      )}
    >
      {isPositive ? `+${value}` : value} vs last week
    </span>
  )
}

export function KPICards({ stats, isLoading }: Readonly<KPICardsProps>) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_SKELETON_KEYS.map((key) => (
          <Card key={key} padding="md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardBody>
              <Skeleton className="mb-1 h-8 w-[60px]" />
              <Skeleton className="h-3 w-[80px]" />
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-sm font-medium text-[--color-text-subtle]">
          Problems Solved
          <BookOpen className="h-4 w-4 text-[--color-text-subtle]" />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-bold">
            <CountUp value={stats.problemsSolved} />
          </div>
          <DeltaBadge value={stats.problemsSolvedDelta} />
        </CardBody>
      </Card>

      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-sm font-medium text-[--color-text-subtle]">
          Accuracy Rate
          <Target className="h-4 w-4 text-[--color-text-subtle]" />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-bold">
            {stats.accuracy === null ? (
              '--%'
            ) : (
              <CountUp value={stats.accuracy} suffix="%" decimals={1} />
            )}
          </div>
          <DeltaBadge value={stats.accuracyDelta} />
        </CardBody>
      </Card>

      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-sm font-medium text-[--color-text-subtle]">
          Current Streak
          <Flame className="h-4 w-4 text-[var(--color-warning)]" />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-bold">
            <CountUp value={stats.currentStreak} /> <span className="text-sm font-normal text-[--color-text-subtle]">days</span>
          </div>
          <DeltaBadge value={stats.currentStreakDelta} />
        </CardBody>
      </Card>

      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-sm font-medium text-[--color-text-subtle]">
          Topics Mastered
          <Trophy className="h-4 w-4 text-[--color-text-subtle]" />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-bold">
            <CountUp value={stats.topicsMastered} />
          </div>
          <DeltaBadge value={stats.topicsMasteredDelta} />
        </CardBody>
      </Card>
    </div>
  )
}
