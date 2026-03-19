"use server";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { getCurrentSession } from "@/modules/authentication";
import {
  updateUserProfile,
  ProfileNotFoundError,
  InvalidTimezoneError,
  NoProfileFieldsError,
} from "@/modules/user-profiles";
import type { UpdateProfileChanges } from "@/modules/user-profiles";
import { logger, getRequestId } from "@/lib/observability";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * Normalizes form data into a strongly-typed Partial update object.
 * Empty strings are coerced to null (clearing the value).
 * Omitted fields remain completely absent, resulting in no change to those fields.
 */
function normalizeFormInput(formData: FormData): Partial<UpdateProfileChanges> {
  const changes: Partial<UpdateProfileChanges> = {};

  const displayName = formData.get("displayName");
  if (typeof displayName === "string") {
    const v = displayName.trim();
    changes.displayName = v || null;
  }

  const avatarUrl = formData.get("avatarUrl");
  if (typeof avatarUrl === "string") {
    const v = avatarUrl.trim();
    changes.avatarUrl = v || null;
  }

  const timezone = formData.get("timezone");
  if (typeof timezone === "string" && timezone.trim()) {
    changes.timezone = timezone.trim();
  }

  return changes;
}

export async function updateProfileAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureModulesBootstrapped();

  const { session } = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // ROOT boundary for request correlation resolution
  const requestId = await getRequestId();
  const changes = normalizeFormInput(formData);
  
  if (Object.keys(changes).length === 0) {
    return { success: false, error: "No changes provided" };
  }

  try {
    // Service encapsulates data access and repository strategy.
    await updateUserProfile({ userId: session.userId, changes }, { requestId });
    return { success: true };
  } catch (error) {
    if (error instanceof InvalidTimezoneError) {
      return { success: false, error: "Invalid timezone" };
    }
    
    if (error instanceof NoProfileFieldsError) {
      return { success: false, error: "No changes provided" };
    }
    
    if (error instanceof ProfileNotFoundError) {
      return { success: false, error: "Profile not found" };
    }
    
    // Hardened error reporting with strict schema and requestId correlation
    logger.warn({
      event: "profile.action.updateProfile.error",
      requestId,
      meta: {
        userId: session.userId,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    return { success: false, error: "Failed to update profile" };
  }
}
