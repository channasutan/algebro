import { createServerClient } from '@/lib/supabase/server'
import { DashboardRepository } from '../repositories/dashboard-repository'

export async function getAuthenticatedUser() {
  const supabase = await createServerClient()
  const repo = new DashboardRepository(supabase)
  return repo.getAuthenticatedUser()
}

