import 'client-only'
export {
  useDashboardStats,
  useRecentActivity,
  useProgressChart as useDashboardProgressChart
} from './hooks/use-dashboard-query'
export type { DashboardStats, ActivityItem, ProgressDataPoint } from './validations/dashboard'

// Also export the fetchers for manual use if needed
export {
  fetchDashboardStats,
  fetchRecentActivity,
  fetchProgressChart
} from './services/dashboard-browser-fetch'
