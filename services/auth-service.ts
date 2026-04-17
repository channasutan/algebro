import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireAuth as _requireAuth } from "@/lib/auth/server-auth-facade";

/**
 * Combines Supabase client creation + auth check so app/** routes
 * don't need to import from supabase-clients directly.
 */
export async function requireAuth(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const supabase = await getSupabaseServerClient();
  return _requireAuth(supabase);
}
