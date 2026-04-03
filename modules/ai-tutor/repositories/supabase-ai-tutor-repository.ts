import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { dbSelect } from "@/lib/supabase/repository-utils";

import type { AiTutorRepository } from "./ai-tutor-repository";

export function buildSupabaseAiTutorRepository(client: SupabaseClient): AiTutorRepository {
  const getReadClient = () => Promise.resolve(client);
  return createRepositoryFromClient(getReadClient);
}

export function createSupabaseAiTutorRepository(): AiTutorRepository {
  return createRepositoryFromClient(getSupabaseServerClient);
}

function createRepositoryFromClient(
  getReadClient: () => SupabaseClient | Promise<SupabaseClient>
): AiTutorRepository {
  const getHintUsage = async (userId: string, problemId: string): Promise<number> => {
    const data = await dbSelect<Record<string, unknown> | null>(await getReadClient(), "ai_hint_usage", {
      filters: { user_id: userId, problem_id: problemId },
      maybeSingle: true,
      context: "ai-tutor"
    });

    return (data?.hint_count as number | undefined) ?? 0;
  };

  const incrementHintUsage = async (userId: string, problemId: string): Promise<void> => {
    const adminClient = getSupabaseAdminClient();

    // Call the database function for atomic increment
    // This ensures hint_count = hint_count + 1 is executed atomically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any).rpc('increment_ai_hint_usage', {
      p_user_id: userId,
      p_problem_id: problemId
    });

    if (error) {
      throw new Error(`[ai-tutor] Failed to increment hint usage: ${error.message}`);
    }
  };

  return {
    getHintUsage,
    incrementHintUsage
  };
}
