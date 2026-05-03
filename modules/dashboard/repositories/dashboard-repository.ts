// dashboard-repository.ts
import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server-client'
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

export class DashboardRepository {
  private readonly clientPromise = getSupabaseServerClient()

  private async getClient() {
    return this.clientPromise
  }

  async getAuthenticatedUser() {
    const client = await this.getClient()
    const {
      data: { user },
    } = await client.auth.getUser()
    return user
  }

  async fetchDashboardStats(userId: string) {
    const client = await this.getClient()
    const { sessions, attempts } = await queryDashboardStats(client, userId)
    return dashboardStatsSchema.parse({
      ...computeDashboardStats(sessions, attempts),
      currentStreak: 0,
    })
  }

  async fetchRecentActivity(userId: string, limit: number) {
    const client = await this.getClient()
    const sessions = await queryRecentActivity(client, userId, limit)
    return z.array(activityItemSchema).parse(mapActivityItems(sessions, limit))
  }

  async fetchProgressChart(userId: string, days: number) {
    const client = await this.getClient()
    const { sessions, attempts } = await queryProgressChart(client, userId, days)
    return z
      .array(progressDataPointSchema)
      .parse(aggregateProgressChart(sessions, attempts, days))
  }
}
