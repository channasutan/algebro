import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
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

export class DashboardRepository {
  constructor(private client: SupabaseClient<Database>) {}

  async fetchDashboardStats(userId: string): Promise<DashboardStats> {
    const [sessionsRes, attemptsRes, masteryRes] = await Promise.all([
      this.client
        .from('practice_sessions')
        .select('id, started_at, completed_at, created_at, topic_id')
        .eq('user_id', userId),
      this.client.from('attempts').select('is_correct').eq('user_id', userId),
      this.client
        .from('topic_progress')
        .select('mastery_score')
        .eq('user_id', userId)
        .order('last_practiced_at', { ascending: false })
        .limit(1)
    ])

    if (sessionsRes.error) throw new Error(sessionsRes.error.message)
    if (attemptsRes.error) throw new Error(attemptsRes.error.message)

    const sessions = sessionsRes.data ?? []
    const attempts = attemptsRes.data ?? []
    const currentStreak = 0

    return dashboardStatsSchema.parse({
      ...computeDashboardStats(sessions, attempts),
      currentStreak,
    })
  }

  async fetchRecentActivity(userId: string, limit: number): Promise<ActivityItem[]> {
    // Fetch sessions and their attempts in parallel or via a join
    // For simplicity and since it's a small number, we'll fetch them separately
    const { data: sessions, error: sessionsError } = await this.client
      .from('practice_sessions')
      .select(`
        id, 
        completed_at, 
        created_at, 
        topic_id,
        attempts (
          id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sessionsError) throw new Error(sessionsError.message)

    return z.array(activityItemSchema).parse(mapActivityItems(sessions ?? [], limit))
  }

  async fetchProgressChart(userId: string, days: number): Promise<ProgressDataPoint[]> {
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)

    const [sessionsRes, attemptsRes] = await Promise.all([
      this.client
        .from('practice_sessions')
        .select('id, created_at, started_at, completed_at')
        .eq('user_id', userId)
        .gte('created_at', dateLimit.toISOString()),
      this.client
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
}
