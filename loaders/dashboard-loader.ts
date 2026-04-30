/**
 * Re-exports dashboard loader for app/ layer consumption.
 * Prevents app/ → lib/ barrel imports (architecture.yml constraint).
 */
export { loadDashboardPage } from '@/lib/loaders/dashboard-loader'
