import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { UserProfile } from "../domain/profile";

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
    const client = await getClient();
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message, { cause: error });
    }

    if (!data) {
      return null;
    }

    return {
      userId: data.id,
      email: data.email,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      timezone: data.timezone,
      updatedAt: data.updated_at,
    };
  };

  const insertProfile = async (input: InsertProfileInput): Promise<UserProfile | null> => {
    const client = await getClient();
    
    // Upsert without selecting - makes behavior deterministic
    const { error: upsertError } = await client
      .from("users")
      .upsert(
        {
          id: input.id,
          email: input.email,
          timezone: input.timezone,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

    if (upsertError) {
      throw new Error(upsertError.message, { cause: upsertError });
    }

    // Always fetch after upsert to get the profile
    return findById(input.id);
  };

  const updateProfile = async (userId: string, changes: UpdateProfileInput): Promise<UserProfile> => {
    const dbChanges: Record<string, string | null> = {};

    if (changes.displayName !== undefined) {
      dbChanges.display_name = changes.displayName;
    }
    if (changes.avatarUrl !== undefined) {
      dbChanges.avatar_url = changes.avatarUrl;
    }
    if (changes.timezone !== undefined) {
      dbChanges.timezone = changes.timezone;
    }

    const client = await getClient();
    const { data, error } = await client
      .from("users")
      .update(dbChanges)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(error.message, { cause: error });
    }

    if (!data) {
      throw new Error("[user-profiles] failed to update profile: not found");
    }

    return {
      userId: data.id,
      email: data.email,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      timezone: data.timezone,
      updatedAt: data.updated_at,
    };
  };

  return {
    findById,
    insertProfile,
    updateProfile,
  };
}
