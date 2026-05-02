import { DashboardRepository } from '../repositories/dashboard-repository'

export async function getAuthenticatedUser() {
  const repo = new DashboardRepository()
  return repo.getAuthenticatedUser()
}
