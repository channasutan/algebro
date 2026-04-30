'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Compass } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface QuickActionsProps {
  lastTopicId?: string | null
  isLoading?: boolean
}

export function QuickActions({ lastTopicId, isLoading }: QuickActionsProps) {
  if (isLoading) {
    return (
      <Card padding="md">
        <CardHeader className="pb-4 text-lg font-semibold">
          Quick Actions
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <CardHeader className="pb-4 text-lg font-semibold">
        Quick Actions
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <Button asChild size="lg" className="w-full justify-start gap-2">
          <Link href={lastTopicId ? `/practice/${lastTopicId}` : '/practice'}>
            <Play className="h-4 w-4" />
            {lastTopicId ? 'Continue Practice' : 'Start Practicing'}
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full justify-start gap-2">
          <Link href="/topics">
            <Compass className="h-4 w-4" />
            Explore Topics
          </Link>
        </Button>
      </CardBody>
    </Card>
  )
}
