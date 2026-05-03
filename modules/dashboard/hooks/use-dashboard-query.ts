'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardBrowserRepository } from '@/repositories/dashboard/dashboard-browser-repository'
import { queryKeys } from '@/config/query-keys'
import type { DashboardStats, ActivityItem, ProgressDataPoint } from '../validations/dashboard'

export function useDashboardStats(userId: string) {
  const repo = useMemo(() => new DashboardBrowserRepository(), [])
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: () => repo.fetchDashboardStats(userId),
    enabled: !!userId,
  })
}

export function useRecentActivity(userId: string, limit = 10) {
  const repo = useMemo(() => new DashboardBrowserRepository(), [])
  return useQuery<ActivityItem[]>({
    queryKey: queryKeys.dashboard.activity(userId, limit),
    queryFn: () => repo.fetchRecentActivity(userId, limit),
    enabled: !!userId,
  })
}

const RANGE_TO_DAYS: Record<'7d' | '30d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export function useProgressChart(userId: string, range: '7d' | '30d' | '90d') {
  const repo = useMemo(() => new DashboardBrowserRepository(), [])
  return useQuery<ProgressDataPoint[]>({
    queryKey: queryKeys.dashboard.progressChart(userId, range),
    queryFn: () => repo.fetchProgressChart(userId, RANGE_TO_DAYS[range]),
    enabled: !!userId,
  })
}
