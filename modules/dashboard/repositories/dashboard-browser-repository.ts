// dashboard-browser-repository.ts
import 'client-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import {
  queryDashboardStats,
  queryRecentActivity,
  queryProgressChart,
} from './dashboard-queries'
import {
  computeDashboardStats,
  mapActivityItems,
  aggregateProgressChart,
} from '../utils/dashboard-utils'
import {
  dashboardStatsSchema,
  activityItemSchema,
  progressDataPointSchema,
} from '../validations/dashboard'
import { z } from 'zod'

type DbClient = SupabaseClient<Database>

export class DashboardBrowserRepository {
  constructor(private readonly client: DbClient) {}


  async fetchDashboardStats(userId: string) {
    const { sessions, attempts } = await queryDashboardStats(this.client, userId)
    return dashboardStatsSchema.parse({
      ...computeDashboardStats(sessions, attempts),
      currentStreak: 0,
    })
  }

  async fetchRecentActivity(userId: string, limit: number) {
    const sessions = await queryRecentActivity(this.client, userId, limit)
    return z.array(activityItemSchema).parse(mapActivityItems(sessions, limit))
  }

  async fetchProgressChart(userId: string, days: number) {
    const { sessions, attempts } = await queryProgressChart(
      this.client,
      userId,
      days,
    )
    return z
      .array(progressDataPointSchema)
      .parse(aggregateProgressChart(sessions, attempts, days))
  }
}
