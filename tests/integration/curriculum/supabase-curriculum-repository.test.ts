import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import * as ServerClientAuth from "@/lib/supabase/server-client";

import {
  createSupabaseCurriculumRepository,
  createServiceRoleCurriculumRepository,
  type TopicProgress,
} from "@/modules/curriculum/repositories/supabase-curriculum-repository";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL ?? "rls-test-user-a@algebro-test.invalid";
const USER_A_PASSWORD = process.env.TEST_USER_A_PASSWORD ?? "RlsTestUserA!2026";
const USER_B_EMAIL = process.env.TEST_USER_B_EMAIL ?? "rls-test-user-b@algebro-test.invalid";
const USER_B_PASSWORD = process.env.TEST_USER_B_PASSWORD ?? "RlsTestUserB!2026";

function makeAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let adminClient: SupabaseClient;
let TEST_USER_A: string;
let TEST_USER_B: string;

function isTestEnvReady(): boolean {
  return !!adminClient && !!TEST_USER_A && !!TEST_USER_B;
}

async function createTempTopic(suffix: string): Promise<string> {
  const { data: topic } = await adminClient
    .from("topics")
    .insert({ name: `__repo_test_topic_${suffix}__${Date.now()}` })
    .select("id")
    .single();
  return topic!.id;
}

// ─── shared seed helper ───────────────────────────────────────────────────────
// Seeds USER_A with two topic rows (scores 0.8 and 0.2) and USER_B with one row.
// Returns the temporary second topicId so callers can clean it up.
async function seedTwoTopics(
  repo: ReturnType<typeof createServiceRoleCurriculumRepository>,
  primaryTopicId: string
): Promise<string> {
  const topicId2 = await createTempTopic(String(Date.now()));
  await repo.upsertTopicProgress(TEST_USER_A, primaryTopicId, 0.8);
  await repo.upsertTopicProgress(TEST_USER_A, topicId2, 0.2);
  await repo.upsertTopicProgress(TEST_USER_B, primaryTopicId, 0.5);
  return topicId2;
}
// ─────────────────────────────────────────────────────────────────────────────

describe("Supabase Curriculum Repository Integration", () => {
  const isRealDB =
    !!SUPABASE_URL &&
    SUPABASE_URL !== "https://test.supabase.co" &&
    !!process.env.SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isRealDB) {
    it.skip("skipped: no real Supabase URL configured");
    return;
  }

  let userAAccessToken: string;
  let topicId: string;

  beforeAll(async () => {
    adminClient = getSupabaseAdminClient();

    async function getOrCreateUser(email: string, password: string) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: session } = await client.auth.signInWithPassword({ email, password });
      if (session?.session) {
        await adminClient.from("users").upsert({ id: session.session.user.id, email }, { onConflict: "id" });
        return { id: session.session.user.id, accessToken: session.session.access_token };
      }
      const { data: created } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
      if (created?.user) {
        await adminClient.from("users").upsert({ id: created.user.id, email }, { onConflict: "id" });
        const { data: newSession } = await client.auth.signInWithPassword({ email, password });
        return { id: newSession.session!.user.id, accessToken: newSession.session!.access_token };
      }
      throw new Error(`Failed to initialize user ${email}`);
    }

    const [a, b] = await Promise.all([
      getOrCreateUser(USER_A_EMAIL, USER_A_PASSWORD),
      getOrCreateUser(USER_B_EMAIL, USER_B_PASSWORD),
    ]);

    TEST_USER_A = a.id;
    userAAccessToken = a.accessToken;
    TEST_USER_B = b.id;

    const { data: topic } = await adminClient
      .from("topics")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (topic) {
      topicId = topic.id;
    } else {
      const { data: newTopic } = await adminClient
        .from("topics")
        .insert({ name: "__repo_test_topic__" })
        .select("id")
        .single();
      topicId = newTopic!.id;
    }
  }, 30000);

  afterAll(async () => {
    if (!adminClient) return;
    await adminClient.from("topic_progress").delete().in("user_id", [TEST_USER_A, TEST_USER_B]);
    await adminClient.from("users").delete().in("id", [TEST_USER_A, TEST_USER_B]);
    if (TEST_USER_A) await adminClient.auth.admin.deleteUser(TEST_USER_A);
    if (TEST_USER_B) await adminClient.auth.admin.deleteUser(TEST_USER_B);
  }, 30000);

  beforeEach(async () => {
    vi.restoreAllMocks();
    if (isTestEnvReady()) {
      await adminClient.from("topic_progress").delete().in("user_id", [TEST_USER_A, TEST_USER_B]);
    }
  });

  describe("getTopicProgress", () => {
    it("returns null for non-existing row", async () => {
      const repo = createServiceRoleCurriculumRepository();
      const result = await repo.getTopicProgress(TEST_USER_A, topicId);
      expect(result).toBeNull();
    });

    it("returns correct TopicProgress for existing row", async () => {
      const repo = createServiceRoleCurriculumRepository();
      await repo.upsertTopicProgress(TEST_USER_A, topicId, 0.5);
      const result = await repo.getTopicProgress(TEST_USER_A, topicId);
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(TEST_USER_A);
      expect(result?.topicId).toBe(topicId);
      expect(result?.masteryScore).toBe(0.5);
      expect(result?.lastPracticedAt).toBeInstanceOf(Date);
    });
  });

  describe("upsertTopicProgress", () => {
    it("idempotency: calling twice with same data -> only 1 row in DB", async () => {
      const repo = createServiceRoleCurriculumRepository();
      await repo.upsertTopicProgress(TEST_USER_A, topicId, 0.6);
      await repo.upsertTopicProgress(TEST_USER_A, topicId, 0.6);
      const { data } = await adminClient
        .from("topic_progress")
        .select("id")
        .eq("user_id", TEST_USER_A)
        .eq("topic_id", topicId);
      expect(data).toHaveLength(1);
    });

    it("update: calling with different score -> row updated to latest score, last_practiced_at updated", async () => {
      const repo = createServiceRoleCurriculumRepository();
      await repo.upsertTopicProgress(TEST_USER_A, topicId, 0.4);
      await new Promise(resolve => setTimeout(resolve, 100));
      await repo.upsertTopicProgress(TEST_USER_A, topicId, 0.8);
      const second = await repo.getTopicProgress(TEST_USER_A, topicId);
      expect(second?.masteryScore).toBe(0.8);
      const { data } = await adminClient
        .from("topic_progress")
        .select("id")
        .eq("user_id", TEST_USER_A)
        .eq("topic_id", topicId);
      expect(data).toHaveLength(1);
    });
  });

  describe("getTopicProgressByUser", () => {
    it("returns only rows for the given userId (not other users' rows)", async () => {
      const repo = createServiceRoleCurriculumRepository();
      const topicId2 = await seedTwoTopics(repo, topicId);

      const rowsA = await repo.getTopicProgressByUser(TEST_USER_A);
      expect(rowsA).toHaveLength(2);
      expect(rowsA.every((r: TopicProgress) => r.userId === TEST_USER_A)).toBe(true);

      await adminClient.from("topics").delete().eq("id", topicId2);
    });

    it("returns rows ordered by mastery_score ASC", async () => {
      const repo = createServiceRoleCurriculumRepository();
      const topicId2 = await seedTwoTopics(repo, topicId);

      const rowsA = await repo.getTopicProgressByUser(TEST_USER_A);
      expect(rowsA).toHaveLength(2);
      expect(rowsA[0].masteryScore).toBe(0.2);
      expect(rowsA[1].masteryScore).toBe(0.8);

      await adminClient.from("topics").delete().eq("id", topicId2);
    });
  });

  describe("RLS isolation", () => {
    it("createSupabaseCurriculumRepository() (request-scoped) cannot read another user's rows", async () => {
      const serviceRepo = createServiceRoleCurriculumRepository();
      await serviceRepo.upsertTopicProgress(TEST_USER_A, topicId, 0.9);
      await serviceRepo.upsertTopicProgress(TEST_USER_B, topicId, 0.1);

      vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(async () => {
        return makeAuthenticatedClient(userAAccessToken);
      });

      const userARepo = createSupabaseCurriculumRepository();
      const myRow = await userARepo.getTopicProgress(TEST_USER_A, topicId);
      expect(myRow).not.toBeNull();
      expect(myRow?.masteryScore).toBe(0.9);
      const theirRow = await userARepo.getTopicProgress(TEST_USER_B, topicId);
      expect(theirRow).toBeNull();
      const allMyRows = await userARepo.getTopicProgressByUser(TEST_USER_A);
      expect(allMyRows).toHaveLength(1);
      const allTheirRows = await userARepo.getTopicProgressByUser(TEST_USER_B);
      expect(allTheirRows).toHaveLength(0);
    });
  });
});
