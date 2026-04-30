'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { CheckCircle2, Target, Flame, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface KPICardsProps {
  stats?: {
    completedSessions: number
    accuracy: number | null
    currentStreak: number
    totalTimeMinutes: number | null
  }
  isLoading?: boolean
}

interface CountUpProps {
  readonly value: number
  readonly suffix?: string
  readonly decimals?: number
}

const KPI_SKELETON_KEYS = ['kpi-sk-sessions', 'kpi-sk-accuracy', 'kpi-sk-streak', 'kpi-sk-time'] as const

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

export function KPICards({ stats, isLoading }: Readonly<KPICardsProps>) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {KPI_SKELETON_KEYS.map((key) => (
          <Card key={key} padding="md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardBody>
              <Skeleton className="h-8 w-[60px]" />
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-sm font-medium text-[--color-text-subtle]">
          Completed Sessions
          <CheckCircle2 className="h-4 w-4 text-[--color-text-subtle]" />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-bold">
            <CountUp value={stats.completedSessions} />
          </div>
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
        </CardBody>
      </Card>

      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 text-sm font-medium text-[--color-text-subtle]">
          Time Practiced
          <Clock className="h-4 w-4 text-[--color-text-subtle]" />
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-bold">
            {stats.totalTimeMinutes === null ? (
              '--'
            ) : (
              <CountUp value={stats.totalTimeMinutes} decimals={1} />
            )} <span className="text-sm font-normal text-[--color-text-subtle]">min</span>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
