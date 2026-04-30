'use client'

import * as React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type ProgressDataPoint } from '@/lib/validations/dashboard'

interface ProgressChartProps {
  data?: ProgressDataPoint[]
  isLoading?: boolean
}

export function ProgressChart({ data, isLoading }: ProgressChartProps) {
  if (isLoading || !data) {
    return (
      <Card padding="md">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardBody>
          <Skeleton className="h-[300px] w-full" />
        </CardBody>
      </Card>
    )
  }

  // Format the date to something friendlier like "Apr 15"
  const formattedData = data.map((point) => {
    const d = new Date(point.date)
    return {
      ...point,
      formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })

  const hasData = data.length > 0 && data.some((d) => d.accuracyPercent !== null || d.sessionsCompleted > 0)

  return (
    <Card padding="md">
      <CardHeader className="pb-4 text-lg font-semibold">
        Accuracy Progress (Last 30 Days)
      </CardHeader>
      <CardBody>
        <div className="h-[300px] w-full">
          {!hasData ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[oklch(from_var(--color-text)_l_c_h_/_0.15)] bg-[--color-surface-2]">
              <p className="text-sm text-[--color-text-subtle]">No practice data available yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(from var(--color-text) l c h / 0.1)" />
                <XAxis
                  dataKey="formattedDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'oklch(from var(--color-text) l c h / 0.5)' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'oklch(from var(--color-text) l c h / 0.5)' }}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid oklch(from var(--color-text) l c h / 0.08)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracyPercent"
                  name="Accuracy"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--color-primary)' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
