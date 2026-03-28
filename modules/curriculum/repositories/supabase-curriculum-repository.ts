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

type TopicProgressRow = {
  id: string;
  user_id: string;
  topic_id: string;
  mastery_score: number;
  last_practiced_at: string | null;
};

function mapRow(row: TopicProgressRow): TopicProgress {
  return {
    id: row.id,
    userId: row.user_id,
    topicId: row.topic_id,
    masteryScore: row.mastery_score,
    lastPracticedAt: row.last_practiced_at ? new Date(row.last_practiced_at) : null,
  };
}

const TOPIC_PROGRESS_SELECT = "id, user_id, topic_id, mastery_score, last_practiced_at" as const;

async function fetchTopicProgressRows(
  client: SupabaseClient,
  userId: string,
  topicId?: string
): Promise<TopicProgressRow[]> {
  let query = client
    .from("topic_progress")
    .select(TOPIC_PROGRESS_SELECT)
    .eq("user_id", userId);

  if (topicId !== undefined) {
    query = query.eq("topic_id", topicId);
  } else {
    query = query.order("mastery_score", { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TopicProgressRow[];
}

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
    async getTopicProgress(userId: string, topicId: string): Promise<TopicProgress | null> {
      const client = await getClient();
      const rows = await fetchTopicProgressRows(client, userId, topicId);
      return rows.length > 0 ? mapRow(rows[0]) : null;
    },

    async upsertTopicProgress(userId: string, topicId: string, masteryScore: number): Promise<void> {
      const client = await getClient();
      const { error } = await client
        .from("topic_progress")
        .upsert(
          {
            user_id: userId,
            topic_id: topicId,
            mastery_score: masteryScore,
            last_practiced_at: new Date().toISOString(),
          },
          { onConflict: "user_id,topic_id" }
        );

      if (error) throw error;
    },

    async getTopicProgressByUser(userId: string): Promise<TopicProgress[]> {
      const client = await getClient();
      const rows = await fetchTopicProgressRows(client, userId);
      return rows.map(mapRow);
    },
  };
}
