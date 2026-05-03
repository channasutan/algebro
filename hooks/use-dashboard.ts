/**
 * Re-exports dashboard hooks for app/ layer consumption.
 * Prevents app/ → lib/ barrel imports (architecture.yml constraint).
 */
export {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
} from '@/lib/queries/dashboard'

export type {
  DashboardStats,
  ActivityItem,
  ProgressDataPoint,
} from '@/modules/dashboard'
