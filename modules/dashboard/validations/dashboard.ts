import { z } from "zod";

export const dashboardStatsSchema = z.object({
  totalSessions: z.number(),
  completedSessions: z.number(),
  accuracy: z.number().nullable(),
  currentStreak: z.number(),
  totalTimeMinutes: z.number().nullable(),
});

export const activityItemSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.enum(["session_completed", "session_started", "answer_submitted", "streak_achieved"]),
  description: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const progressDataPointSchema = z.object({
  date: z.string(),
  sessionsCompleted: z.number(),
  accuracyPercent: z.number().nullable(),
  minutesPracticed: z.number().nullable(),
});

export const progressChartDataSchema = z.array(progressDataPointSchema);

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ProgressDataPoint = z.infer<typeof progressDataPointSchema>;
export type ProgressChartData = z.infer<typeof progressChartDataSchema>;
