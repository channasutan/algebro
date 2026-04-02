export type HintActionResult =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "hint"; hint: string }
  | { status: "quota_exceeded"; remaining: number }
  | { status: "ai_unavailable" }
  | { status: "validation_error" };
