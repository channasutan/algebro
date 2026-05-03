import { DashboardRepository } from '../repositories/dashboard-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export async function getAuthenticatedUser(supabase: SupabaseClient<Database>) {
  const repo = new DashboardRepository(supabase)
  return repo.getAuthenticatedUser()
}
