'use client'

import { type ReactNode } from 'react'
import { usePing } from '@/hooks/use-ping'
import {
  PageContainer,
  PageContainerHeader,
  PageContainerHeading,
  PageContainerContent,
} from '@/components/ui'

export default function DashboardPage() {
  const { data, isLoading, isError } = usePing()

  // Extracted from nested ternary — SonarCloud S3358
  let content: ReactNode
  if (isLoading) {
    content = <p>Loading...</p>
  } else if (isError) {
    content = <p className="text-[--color-error]">Failed to load data.</p>
  } else {
    content = (
      <pre className="p-4 bg-[--color-surface-2] rounded-[--radius-md] overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    )
  }

  return (
    <PageContainer>
      <PageContainerHeader>
        <PageContainerHeading>Dashboard</PageContainerHeading>
      </PageContainerHeader>
      <PageContainerContent>
        {content}
      </PageContainerContent>
    </PageContainer>
  )
}
