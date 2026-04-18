'use client'

import { usePing } from '@/hooks/use-ping'

export default function DashboardPage() {
  const { data, isLoading } = usePing()
  if (isLoading) return <p>Loading...</p>
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
