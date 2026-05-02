import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { computeDashboardStats, mapActivityItems, aggregateProgressChart }
  from '@/modules/dashboard/utils/dashboard-utils'
import {
  dashboardStatsSchema,
  activityItemSchema,
  progressDataPointSchema,
  type DashboardStats,
  type ActivityItem,
  type ProgressDataPoint,
} from '@/modules/dashboard/validations/dashboard'
import { z } from 'zod'
import type { User } from '@supabase/supabase-js'

type DB = SupabaseClient<Database>

export async function getAuthenticatedUser(supabase: DB): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function prefetchDashboard(
  supabase: DB,
  userId: string,
): Promise<{ stats: DashboardStats; activity: ActivityItem[]; progressChart: ProgressDataPoint[] }> {
  // call the moved services/dashboard-prefetch internally — do NOT import
  // dashboard-prefetch here; instead move its logic inline or call via
  // the service imported from '../services/dashboard-prefetch'
  // dashboard-prefetch is allowed to import from lib/supabase via index.ts wrapper
  const { prefetchDashboardData } = await import('../services/dashboard-prefetch')
  return prefetchDashboardData(supabase, userId)
}

export async function fetchDashboardStats(supabase: DB, userId: string): Promise<DashboardStats> {
  const [sessionsRes, attemptsRes] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('id, started_at, completed_at')
      .eq('user_id', userId),
    supabase.from('attempts').select('is_correct').eq('user_id', userId),
  ])

  if (sessionsRes.error) throw new Error(sessionsRes.error.message)
  if (attemptsRes.error) throw new Error(attemptsRes.error.message)

  return dashboardStatsSchema.parse(
    computeDashboardStats(sessionsRes.data ?? [], attemptsRes.data ?? [])
  )
}

export async function fetchRecentActivity(
  supabase: DB,
  userId: string,
  limit: number
): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('id, completed_at, created_at, topic_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return z.array(activityItemSchema).parse(mapActivityItems(data ?? [], limit))
}

export async function fetchProgressChart(
  supabase: DB,
  userId: string,
  days: number
): Promise<ProgressDataPoint[]> {
  const dateLimit = new Date()
  dateLimit.setDate(dateLimit.getDate() - days)

  const [sessionsRes, attemptsRes] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('id, created_at, started_at, completed_at')
      .eq('user_id', userId)
      .gte('created_at', dateLimit.toISOString()),
    supabase
      .from('attempts')
      .select('session_id, is_correct')
      .eq('user_id', userId)
      .gte('created_at', dateLimit.toISOString()),
  ])

  if (sessionsRes.error) throw new Error(sessionsRes.error.message)
  if (attemptsRes.error) throw new Error(attemptsRes.error.message)

  return z.array(progressDataPointSchema).parse(
    aggregateProgressChart(sessionsRes.data ?? [], attemptsRes.data ?? [], days)
  )
}
