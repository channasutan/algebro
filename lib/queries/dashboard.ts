// lib/queries/dashboard.ts
// ✅ FIXED: direct import — bypasses the barrel and avoids
// any server-only code being pulled into the client bundle.
export { 
  useDashboardStats, 
  useRecentActivity, 
  useProgressChart 
} from "@/modules/dashboard/hooks/use-dashboard-query";
