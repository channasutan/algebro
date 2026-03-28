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
  const getClient = () => Promise.resolve(client);
  return createRepositoryFromClientFactory(getClient);
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
    async getTopicProgress(userId, topicId) {
      throw new Error("Not implemented");
    },
    async upsertTopicProgress(userId, topicId, masteryScore) {
      throw new Error("Not implemented");
    },
    async getTopicProgressByUser(userId) {
      throw new Error("Not implemented");
    }
  };
}
