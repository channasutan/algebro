import 'server-only'

export { DashboardRepository } from './repositories/dashboard-repository'
export { getAuthenticatedUser } from './services/dashboard-auth'
export { prefetchDashboardStats } from './services/dashboard-prefetch'
export type { DashboardStats, ActivityItem, ProgressDataPoint } from './validations/dashboard'
