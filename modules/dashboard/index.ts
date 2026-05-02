export { DashboardBrowserRepository } from './repositories/dashboard-browser-repository'
export { fetchRecentActivity, fetchProgressChart } from './services/dashboard-browser-fetch'
export {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
} from './hooks/use-dashboard-query'
export { prefetchDashboardStats } from './services/dashboard-prefetch'
export { getAuthenticatedUser } from './services/dashboard-auth'
export type { DashboardStats, ActivityItem, ProgressDataPoint } from './validations/dashboard'
