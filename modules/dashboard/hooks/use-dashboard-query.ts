'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import {
  fetchDashboardStats,
  fetchRecentActivity,
  fetchProgressChart,
} from '../services/dashboard-browser-fetch'
import type { DashboardStats, ActivityItem, ProgressDataPoint } from '../validations/dashboard'

function useSupabase() {
  return useMemo(() => createBrowserClient(), [])
}

export function useDashboardStats(userId: string) {
  const supabase = useSupabase()
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(userId),
    queryFn: () => fetchDashboardStats(supabase, userId),
    enabled: !!userId,
  })
}

export function useRecentActivity(userId: string, limit = 10) {
  const supabase = useSupabase()
  return useQuery<ActivityItem[]>({
    queryKey: queryKeys.dashboard.activity(userId, limit),
    queryFn: () => fetchRecentActivity(supabase, userId, limit),
    enabled: !!userId,
  })
}

const RANGE_TO_DAYS: Record<'7d' | '30d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export function useProgressChart(userId: string, range: '7d' | '30d' | '90d') {
  const supabase = useSupabase()
  return useQuery<ProgressDataPoint[]>({
    queryKey: queryKeys.dashboard.progressChart(userId, range),
    queryFn: () => fetchProgressChart(supabase, userId, RANGE_TO_DAYS[range]),
    enabled: !!userId,
  })
}
