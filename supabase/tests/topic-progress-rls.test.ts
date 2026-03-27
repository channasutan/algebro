/**
 * RLS Integration Tests: topic_progress
 *
 * Validates that Row Level Security policies on public.topic_progress
 * enforce per-user data isolation correctly, running against Supabase Cloud.
 *
 * Self-contained: creates and deletes its own test users in beforeAll/afterAll.
 * No manual setup required beyond having the keys in .env.test.
 *
 * Run:
 *   npx vitest run supabase/tests/topic-progress-rls.test.ts \
 *     --config vitest.config.integration.ts
 *
 * Or:
 *   npm run test:integration
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Environment config (injected by vitest.config.integration.ts)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL ?? "rls-test-user-a@algebro-test.invalid";
const USER_A_PASSWORD = process.env.TEST_USER_A_PASSWORD ?? "RlsTestUserA!2026";
const USER_B_EMAIL = process.env.TEST_USER_B_EMAIL ?? "rls-test-user-b@algebro-test.invalid";
const USER_B_PASSWORD = process.env.TEST_USER_B_PASSWORD ?? "RlsTestUserB!2026";

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

/**
 * Authenticated client using anon key + an explicit Authorization header.
 * This is the correct way to enforce RLS in tests — the anon key keeps
 * RLS enabled, and the Bearer token identifies the acting user to PostgREST.
 */
function makeAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Service-role client — bypasses RLS entirely.
 * Used ONLY for setup/teardown and to verify service-role INSERT works.
 */
function makeServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Shared test state
// ---------------------------------------------------------------------------

let serviceClient: SupabaseClient;

let userAId: string;
let userAAccessToken: string;

let userBId: string;
let userBAccessToken: string;

let topicId: string;
let userAProgressRowId: string;

let didSeedTopic = false;
let serviceInsertedRowId: string | null = null;

// ---------------------------------------------------------------------------
// beforeAll
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // ── Validate env ────────────────────────────────────────────────────────
  const required: Record<string, string> = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}\n` +
        "Populate .env.test with your Supabase Cloud credentials."
    );
  }

  serviceClient = makeServiceClient();

  // ── Create / reuse test users via Admin API ─────────────────────────────
  // We use createUser (not signUp) so no confirmation email is needed.
  // If users already exist from a previous aborted run, look them up instead.

  async function getOrCreateUser(
    email: string,
    password: string
  ): Promise<{ id: string; accessToken: string }> {
    // Try to sign in first — covers the "user left over from a previous run" case
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const signInRes = await anonClient.auth.signInWithPassword({ email, password });

    if (signInRes.data.session) {
      // Ensure public.users row exists (may have been cleaned up by a previous aborted run)
      await serviceClient
        .from("users")
        .upsert({ id: signInRes.data.session.user.id, email }, { onConflict: "id", ignoreDuplicates: true });

      return {
        id: signInRes.data.session.user.id,
        accessToken: signInRes.data.session.access_token,
      };
    }

    // User doesn't exist yet — create via admin API
    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification
    });

    if (createError || !created.user) {
      throw new Error(`Failed to create test user ${email}: ${createError?.message}`);
    }

    const authUserId = created.user.id;

    // Sync to public.users — no trigger exists, so we do it manually here.
    // The service-role client bypasses RLS, so this always succeeds.
    const { error: profileError } = await serviceClient
      .from("users")
      .upsert({ id: authUserId, email }, { onConflict: "id", ignoreDuplicates: true });

    if (profileError) {
      throw new Error(`Failed to create public.users row for ${email}: ${profileError.message}`);
    }

    // Now sign in to get a real session/JWT
    const { data: session, error: sessionError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !session.session) {
      throw new Error(
        `Failed to sign in newly created user ${email}: ${sessionError?.message}`
      );
    }

    return {
      id: session.session.user.id,
      accessToken: session.session.access_token,
    };
  }

  const [userA, userB] = await Promise.all([
    getOrCreateUser(USER_A_EMAIL, USER_A_PASSWORD),
    getOrCreateUser(USER_B_EMAIL, USER_B_PASSWORD),
  ]);

  userAId = userA.id;
  userAAccessToken = userA.accessToken;
  userBId = userB.id;
  userBAccessToken = userB.accessToken;

  // ── Resolve a topic_id ─────────────────────────────────────────────────
  const { data: existingTopic, error: topicError } = await serviceClient
    .from("topics")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (topicError) {
    throw new Error(`Failed to query topics table: ${topicError.message}`);
  }

  if (existingTopic) {
    topicId = existingTopic.id as string;
  } else {
    // Seed a minimal topic — adjust to match your topics table schema if needed
    const { data: newTopic, error: seedError } = await serviceClient
      .from("topics")
      .insert({ name: "__rls_test_topic__" })
      .select("id")
      .single();

    if (seedError || !newTopic) {
      throw new Error(`Failed to seed test topic: ${seedError?.message}`);
    }
    topicId = newTopic.id as string;
    didSeedTopic = true;
  }

  // ── Seed User A's topic_progress row via service-role ──────────────────
  // Clean up any stale row from a previous aborted run first
  await serviceClient
    .from("topic_progress")
    .delete()
    .eq("user_id", userAId)
    .eq("topic_id", topicId);

  const { data: seededRow, error: seedRowError } = await serviceClient
    .from("topic_progress")
    .insert({ user_id: userAId, topic_id: topicId, mastery_score: 0.5 })
    .select("id")
    .single();

  if (seedRowError || !seededRow) {
    throw new Error(`Failed to seed topic_progress for User A: ${seedRowError?.message}`);
  }

  userAProgressRowId = seededRow.id as string;
}, 30_000);

// ---------------------------------------------------------------------------
// afterAll — clean up ALL test data and users
// ---------------------------------------------------------------------------

afterAll(async () => {
  if (!serviceClient) return;

  // Delete topic_progress rows by known IDs
  const progressIdsToDelete = [userAProgressRowId, serviceInsertedRowId].filter(
    Boolean
  ) as string[];

  if (progressIdsToDelete.length > 0) {
    await serviceClient.from("topic_progress").delete().in("id", progressIdsToDelete);
  }

  // Belt-and-suspenders: sweep any remaining rows for our test users
  if (userAId || userBId) {
    const userIds = [userAId, userBId].filter(Boolean);
    await serviceClient.from("topic_progress").delete().in("user_id", userIds);
  }

  // Remove seeded topic only if we created it
  if (didSeedTopic && topicId) {
    await serviceClient.from("topics").delete().eq("id", topicId);
  }

  // Delete public.users rows (cascade will also delete topic_progress if any remain,
  // but we already cleaned those above — belt-and-suspenders)
  const userIds = [userAId, userBId].filter(Boolean);
  if (userIds.length > 0) {
    await serviceClient.from("users").delete().in("id", userIds);
  }

  // Delete Auth users last (after public.users rows so FK cascade doesn't race)
  const deleteJobs: Promise<unknown>[] = [];
  if (userAId) deleteJobs.push(serviceClient.auth.admin.deleteUser(userAId));
  if (userBId) deleteJobs.push(serviceClient.auth.admin.deleteUser(userBId));
  await Promise.allSettled(deleteJobs); // allSettled — don't fail cleanup on partial errors
}, 30_000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("topic_progress RLS policies", () => {
  /**
   * Test 1 — User A reads their own row
   * Expectation: data.length === 1, correct row returned
   */
  it("User A can SELECT their own topic_progress row", async () => {
    const clientA = makeAuthenticatedClient(userAAccessToken);

    const { data, error } = await clientA
      .from("topic_progress")
      .select("id, user_id, mastery_score")
      .eq("id", userAProgressRowId);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBe(1);
    expect(data![0].id).toBe(userAProgressRowId);
    expect(data![0].user_id).toBe(userAId);
  });

  /**
   * Test 2 — User B tries to read User A's row
   * Expectation: empty array (NO error — RLS silently filters, never rejects SELECT)
   */
  it("User B CANNOT SELECT User A's row — RLS returns empty array, not an error", async () => {
    const clientB = makeAuthenticatedClient(userBAccessToken);

    const { data, error } = await clientB
      .from("topic_progress")
      .select("id, user_id, mastery_score")
      .eq("id", userAProgressRowId);

    expect(error).toBeNull(); // RLS never throws on SELECT — it just hides rows
    expect(data).not.toBeNull();
    expect(data!.length).toBe(0);
  });

  /**
   * Test 3 — Authenticated user tries to INSERT via anon+JWT client
   * Expectation: PostgreSQL error 42501 (insufficient_privilege)
   * because no INSERT policy exists for the authenticated role
   */
  it("INSERT via anon+JWT client is rejected with PostgreSQL error 42501", async () => {
    const clientA = makeAuthenticatedClient(userAAccessToken);

    const { error } = await clientA.from("topic_progress").insert({
      user_id: userAId,
      topic_id: topicId,
      mastery_score: 0.1,
    });

    expect(error).not.toBeNull();
    // PostgreSQL SQLSTATE 42501 = insufficient_privilege
    // PostgREST returns this as error.code
    expect(error!.code).toBe("42501");
  });

  /**
   * Test 4 — Service-role client inserts a row
   * Expectation: success (service-role bypasses RLS entirely)
   * Uses User B to avoid the UNIQUE (user_id, topic_id) constraint already
   * satisfied by User A's seeded row.
   */
  it("INSERT via service-role client succeeds (bypasses RLS)", async () => {
    // Clean potential stale row for User B first
    await serviceClient
      .from("topic_progress")
      .delete()
      .eq("user_id", userBId)
      .eq("topic_id", topicId);

    const { data, error } = await serviceClient
      .from("topic_progress")
      .insert({ user_id: userBId, topic_id: topicId, mastery_score: 0.75 })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBeDefined();

    // Track for cleanup in afterAll
    serviceInsertedRowId = data!.id as string;
  });
});
