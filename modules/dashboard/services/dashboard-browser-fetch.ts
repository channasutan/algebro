import { createBrowserClient } from '@/lib/supabase/client'
import { DashboardBrowserRepository } from '../repositories/dashboard-browser-repository'

const repo = new DashboardBrowserRepository(createBrowserClient())


export async function fetchDashboardStats(userId: string) {
  return repo.fetchDashboardStats(userId)
}

export async function fetchRecentActivity(userId: string, limit: number) {
  return repo.fetchRecentActivity(userId, limit)
}

export async function fetchProgressChart(userId: string, days: number) {
  return repo.fetchProgressChart(userId, days)
}
