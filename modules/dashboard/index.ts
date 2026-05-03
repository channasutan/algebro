// modules/dashboard/index.ts
// ✅ Client-safe barrel — ONLY client-safe exports allowed here.
// Server-only exports live in index.server.ts — use that on the server.

export { DashboardBrowserRepository } from '@/repositories/dashboard/dashboard-browser-repository'
export {
  useDashboardStats,
  useRecentActivity,
  useProgressChart,
} from './hooks/use-dashboard-query'
export { queryKeys } from '@/lib/queries/keys'

// Types carry no runtime code — always safe to export from either barrel
export type {
  DashboardStats,
  ActivityItem,
  ProgressDataPoint,
} from './validations/dashboard'

// ❌ DO NOT re-add: prefetchDashboardStats — server-only, lives in index.server.ts
// ❌ DO NOT re-add: getAuthenticatedUser    — server-only, lives in index.server.ts
