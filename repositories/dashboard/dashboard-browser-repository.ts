// repositories/dashboard/dashboard-browser-repository.ts
import 'client-only'
import { createBrowserClient } from '@/lib/supabase/client'
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
} from '@/modules/dashboard/utils/dashboard-utils'
import {
  dashboardStatsSchema,
  activityItemSchema,
  progressDataPointSchema,
} from '@/modules/dashboard/validations/dashboard'
import { z } from 'zod'

type DbClient = SupabaseClient<Database>

export class DashboardBrowserRepository {
  private readonly client: DbClient

  constructor(client?: DbClient) {
    this.client = client ?? createBrowserClient()
  }

  async fetchDashboardStats(userId: string) {
    const { sessions, attempts } = await queryDashboardStats(this.client, userId)
    return dashboardStatsSchema.parse({
      ...computeDashboardStats(sessions, attempts),
      currentStreak: 0, // Intentional override — streak engine not yet implemented
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
