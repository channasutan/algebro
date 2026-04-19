'use client'

import { usePing } from '@/hooks/use-ping'
import {
  PageContainer,
  PageContainerHeader,
  PageContainerHeading,
  PageContainerContent,
} from '@/components/ui'

export default function DashboardPage() {
  const { data, isLoading, isError } = usePing()

  return (
    <PageContainer>
      <PageContainerHeader>
        <PageContainerHeading>Dashboard</PageContainerHeading>
      </PageContainerHeader>
      <PageContainerContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : isError ? (
          <p className="text-[--color-error]">Failed to load data.</p>
        ) : (
          <pre className="p-4 bg-[--color-surface-2] rounded-[--radius-md] overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </PageContainerContent>
    </PageContainer>
  )
}
