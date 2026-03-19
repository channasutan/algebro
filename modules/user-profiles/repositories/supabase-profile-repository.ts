import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getPublicEnv } from "@/config/env.server-entry";
import type { UserProfile } from "../domain/profile";
import { dbSelect, dbUpdate, dbUpsert } from "@/lib/supabase/repository-utils";

export type InsertProfileInput = {
  id: string;
  email: string;
  timezone: string;
};

export type UpdateProfileInput = {
  displayName?: string | null;
  avatarUrl?: string | null;
  timezone?: string;
};

export interface ProfileRepository {
  findById(userId: string): Promise<UserProfile | null>;
  insertProfile(input: InsertProfileInput): Promise<UserProfile | null>;
  updateProfile(userId: string, changes: UpdateProfileInput): Promise<UserProfile>;
}

export function buildProfileRepository(client: SupabaseClient): ProfileRepository {
  const getClient = () => Promise.resolve(client);
  return createRepositoryFromClientFactory(getClient);
}

export function createSupabaseProfileRepository(): ProfileRepository {
  return createRepositoryFromClientFactory(getSupabaseServerClient);
}

export function createServiceRoleProfileRepository(): ProfileRepository {
  return createRepositoryFromClientFactory(getSupabaseAdminClient);
}

function createRepositoryFromClientFactory(
  getClient: () => SupabaseClient | Promise<SupabaseClient>
): ProfileRepository {
  const findById = async (userId: string): Promise<UserProfile | null> => {
    const data = await dbSelect<Record<string, unknown> | null>(await getClient(), "users", {
      filters: { id: userId },
      maybeSingle: true,
      context: "user-profiles"
    });

    if (!data) {
      return null;
    }

    return {
      userId: data.id as string,
      email: data.email as string,
      displayName: data.display_name as string | null,
      avatarUrl: data.avatar_url as string | null,
      timezone: data.timezone as string,
      updatedAt: data.updated_at as string,
    };
  };

  const insertProfile = async (input: InsertProfileInput): Promise<UserProfile | null> => {
    await dbUpsert(await getClient(), "users", {
      id: input.id,
      email: input.email,
      timezone: input.timezone,
    }, {
      onConflict: "id",
      ignoreDuplicates: true,
      context: "user-profiles"
    });

    // Bounded retry to eliminate read-after-write race conditions
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const profile = await findById(input.id);
      if (profile) return profile;

      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (!isLastAttempt) {
        const delayMs = 5 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      const env = getPublicEnv();
      if (env.nodeEnv !== "production") {
        console.warn("[user-profiles] findById failed after retries", { userId: input.id });
      }
    }

    return null;
  };

  const updateProfile = async (userId: string, changes: UpdateProfileInput): Promise<UserProfile> => {
    const dbChanges: Record<string, unknown> = {};

    if (changes.displayName !== undefined) {
      dbChanges.display_name = changes.displayName;
    }
    if (changes.avatarUrl !== undefined) {
      dbChanges.avatar_url = changes.avatarUrl;
    }
    if (changes.timezone !== undefined) {
      dbChanges.timezone = changes.timezone;
    }

    const data = await dbUpdate<Record<string, unknown>>({
      client: await getClient(),
      table: "users",
      id: userId,
      values: dbChanges,
      options: {
        context: "user-profiles",
        errorFactory: () => new Error("[user-profiles] failed to update profile: not found")
      }
    });

    return {
      userId: data.id as string,
      email: data.email as string,
      displayName: data.display_name as string | null,
      avatarUrl: data.avatar_url as string | null,
      timezone: data.timezone as string,
      updatedAt: data.updated_at as string,
    };
  };

  return {
    findById,
    insertProfile,
    updateProfile,
  };
}
