import { z } from "zod";

export const CheckQuotaInputSchema = z.object({
  userId: z.string(),
  problemId: z.string()
});

export type CheckQuotaInput = z.infer<typeof CheckQuotaInputSchema>;

export type CheckQuotaResult =
  | { allowed: true; remaining: number | null }
  | { allowed: false; reason: "quota_exceeded"; remaining: 0 };
