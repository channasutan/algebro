'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { type ActivityItem } from '@/modules/dashboard'
import { CheckCircle2, Award, FileText } from 'lucide-react'

interface RecentActivityProps {
  activity?: ActivityItem[]
  isLoading?: boolean
}

const ACTIVITY_SKELETON_KEYS = [
  'act-sk-1',
  'act-sk-2',
  'act-sk-3',
  'act-sk-4',
  'act-sk-5',
] as const

export function RecentActivity({ activity, isLoading }: Readonly<RecentActivityProps>) {
  if (isLoading || !activity) {
    return (
      <Card padding="md">
        <CardHeader className="pb-4 text-lg font-semibold">
          Recent Activity
        </CardHeader>
        <CardBody className="space-y-4">
          {ACTIVITY_SKELETON_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'session_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'streak_achieved':
        return <Award className="h-5 w-5 text-yellow-500" />
      default:
        return <FileText className="h-5 w-5 text-blue-500" />
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const now = Date.now()
    const daysDifference = Math.round(
      (new Date(dateString).getTime() - now) / (1000 * 60 * 60 * 24)
    )

    if (daysDifference === 0) {
      const hoursDifference = Math.round(
        (new Date(dateString).getTime() - now) / (1000 * 60 * 60)
      )
      if (hoursDifference === 0) return 'Just now'
      return rtf.format(hoursDifference, 'hour')
    }

    return rtf.format(daysDifference, 'day')
  }

  return (
    <Card padding="md">
      <CardHeader className="pb-4 text-lg font-semibold">
        Recent Activity
      </CardHeader>
      <CardBody>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[oklch(from_var(--color-text)_l_c_h_/_0.15)] bg-[--color-surface-2] p-8 text-center">
            <FileText className="mb-2 h-8 w-8 text-[--color-text-subtle]" />
            <p className="font-medium text-[--color-text]">No activity yet</p>
            <p className="text-sm text-[--color-text-subtle]">Start your first practice session!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--color-surface-2]">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {item.description}
                  </p>
                  <p className="text-sm text-[--color-text-subtle]">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                {item.metadata && typeof item.metadata.sessionId === 'string' && typeof item.metadata.attemptId === 'string' && (
                  <Link
                    href={`/practice/${item.metadata.sessionId}?attemptId=${item.metadata.attemptId}`}
                    className="text-sm font-medium text-[--color-primary] hover:underline"
                  >
                    View
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
