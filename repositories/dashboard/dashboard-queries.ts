// modules/dashboard/repositories/dashboard-queries.ts
// ✅ Pure query builders — no Supabase client import, no server-only/client-only
// dependency. Safe to import from both browser and server contexts.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

export async function queryDashboardStats(client: Client, userId: string) {
  const [sessionsRes, attemptsRes] = await Promise.all([
    client
      .from('practice_sessions')
      .select('id, started_at, completed_at, created_at, topic_id')
      .eq('user_id', userId),
    client
      .from('attempts')
      .select('is_correct')
      .eq('user_id', userId),
  ])

  if (sessionsRes.error) throw new Error(sessionsRes.error.message)
  if (attemptsRes.error) throw new Error(attemptsRes.error.message)

  return {
    sessions: sessionsRes.data ?? [],
    attempts: attemptsRes.data ?? [],
  }
}

export async function queryRecentActivity(
  client: Client,
  userId: string,
  limit: number,
) {
  const { data: sessions, error } = await client
    .from('practice_sessions')
    .select(`id, completed_at, created_at, topic_id, attempts (id, created_at)`)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return sessions ?? []
}

export async function queryProgressChart(
  client: Client,
  userId: string,
  days: number,
) {
  const dateLimit = new Date()
  dateLimit.setDate(dateLimit.getDate() - days)
  const iso = dateLimit.toISOString()

  const [sessionsRes, attemptsRes] = await Promise.all([
    client
      .from('practice_sessions')
      .select('id, created_at, started_at, completed_at')
      .eq('user_id', userId)
      .gte('created_at', iso),
    client
      .from('attempts')
      .select('session_id, is_correct')
      .eq('user_id', userId)
      .gte('created_at', iso),
  ])

  if (sessionsRes.error) throw new Error(sessionsRes.error.message)
  if (attemptsRes.error) throw new Error(attemptsRes.error.message)

  return {
    sessions: sessionsRes.data ?? [],
    attempts: attemptsRes.data ?? [],
  }
}
