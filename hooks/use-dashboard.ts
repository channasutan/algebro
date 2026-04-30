/**
 * Re-exports dashboard hooks for app/ layer consumption.
 * Prevents app/ → lib/ barrel imports (architecture.yml constraint).
 */
import {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
} from '@/lib/queries/dashboard'

import type {
  DashboardStats,
  ActivityItem,
  ProgressDataPoint,
} from '@/lib/validations/dashboard'

export {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
}

export type {
  DashboardStats,
  ActivityItem,
  ProgressDataPoint,
}
