export const queryKeys = {
  dashboard: {
    all: (userId: string) => ["dashboard", userId] as const,
    stats: (userId: string) => ["dashboard", userId, "stats"] as const,
    activity: (userId: string, limit: number) => ["dashboard", userId, "activity", limit] as const,
    progressChart: (userId: string, range: "7d" | "30d" | "90d") =>
      ["dashboard", userId, "progress-chart", range] as const,
  },
} as const;
