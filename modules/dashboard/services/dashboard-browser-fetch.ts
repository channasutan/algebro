import { DashboardBrowserRepository } from '../repositories/dashboard-browser-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type DbClient = SupabaseClient<Database>

export async function fetchDashboardStats(supabase: DbClient, userId: string) {
  return new DashboardBrowserRepository(supabase).fetchDashboardStats(userId)
}

export async function fetchRecentActivity(supabase: DbClient, userId: string, limit: number) {
  return new DashboardBrowserRepository(supabase).fetchRecentActivity(userId, limit)
}

export async function fetchProgressChart(supabase: DbClient, userId: string, days: number) {
  return new DashboardBrowserRepository(supabase).fetchProgressChart(userId, days)
}
