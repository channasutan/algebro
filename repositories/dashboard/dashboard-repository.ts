// repositories/dashboard/dashboard-repository.ts
import 'server-only'
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

export class DashboardRepository {
  constructor(private readonly client: DbClient) {}

  async getAuthenticatedUser() {
    const {
      data: { user },
    } = await this.client.auth.getUser()
    return user
  }

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
    const { sessions, attempts } = await queryProgressChart(this.client, userId, days)
    return z
      .array(progressDataPointSchema)
      .parse(aggregateProgressChart(sessions, attempts, days))
  }
}
