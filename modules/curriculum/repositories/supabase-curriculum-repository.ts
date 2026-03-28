// Repository interface — implemented by integration layer (supabase)
// Services only depend on this interface, never on lib/supabase/* directly

export interface TopicProgress {
  id: string;
  userId: string;
  topicId: string;
  masteryScore: number;
  lastPracticedAt: Date | null;
}

export interface CurriculumRepository {
  getTopicProgress(userId: string, topicId: string): Promise<TopicProgress | null>;
  upsertTopicProgress(userId: string, topicId: string, masteryScore: number): Promise<void>;
  getTopicProgressByUser(userId: string): Promise<TopicProgress[]>;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export function buildCurriculumRepository(client: SupabaseClient): CurriculumRepository {
  return createRepositoryFromClientFactory(() => Promise.resolve(client));
}

export function createSupabaseCurriculumRepository(): CurriculumRepository {
  return createRepositoryFromClientFactory(getSupabaseServerClient);
}

export function createServiceRoleCurriculumRepository(): CurriculumRepository {
  return createRepositoryFromClientFactory(getSupabaseAdminClient);
}

function createRepositoryFromClientFactory(
  getClient: () => SupabaseClient | Promise<SupabaseClient>
): CurriculumRepository {
  return {
    async getTopicProgress(_userId: string, _topicId: string): Promise<TopicProgress | null> {
      const client = await getClient();
      const { data, error } = await client
        .from("topic_progress")
        .select("id, user_id, topic_id, mastery_score, last_practiced_at")
        .eq("user_id", _userId)
        .eq("topic_id", _topicId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        topicId: data.topic_id,
        masteryScore: data.mastery_score,
        lastPracticedAt: data.last_practiced_at ? new Date(data.last_practiced_at) : null,
      };
    },

    async upsertTopicProgress(_userId: string, _topicId: string, _masteryScore: number): Promise<void> {
      const client = await getClient();
      const { error } = await client
        .from("topic_progress")
        .upsert(
          {
            user_id: _userId,
            topic_id: _topicId,
            mastery_score: _masteryScore,
            last_practiced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,topic_id" }
        );

      if (error) throw error;
    },

    async getTopicProgressByUser(_userId: string): Promise<TopicProgress[]> {
      const client = await getClient();
      const { data, error } = await client
        .from("topic_progress")
        .select("id, user_id, topic_id, mastery_score, last_practiced_at")
        .eq("user_id", _userId)
        .order("mastery_score", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        topicId: row.topic_id,
        masteryScore: row.mastery_score,
        lastPracticedAt: row.last_practiced_at ? new Date(row.last_practiced_at) : null,
      }));
    },
  };
}
