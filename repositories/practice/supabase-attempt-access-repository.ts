import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server-client";

type AttemptAccessRecord = {
  user_id: string;
  status: string;
};

export type AttemptAccessResult =
  | {
      userId: string;
      attemptStatus: string;
    }
  | {
      error: string;
      status: number;
    };

/**
 * Validates the current authenticated user's access to an attempt.
 * Business rule: users can only access their own attempts.
 */
export async function verifyAuthenticatedAttemptAccess(
  attemptId: string
): Promise<AttemptAccessResult> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("user_id, status")
    .eq("id", attemptId)
    .maybeSingle<AttemptAccessRecord>();

  if (error || !attempt) {
    return { error: "Attempt not found", status: 404 };
  }

  if (attempt.user_id !== user.id) {
    return { error: "Forbidden", status: 403 };
  }

  return {
    userId: user.id,
    attemptStatus: attempt.status,
  };
}
