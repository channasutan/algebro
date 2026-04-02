BEGIN;

ALTER TABLE public.ai_hint_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_hint_usage FORCE ROW LEVEL SECURITY;

-- Users can read their own hint usage rows.
-- The service role can also read for admin/reporting purposes.
DROP POLICY IF EXISTS ai_hint_usage_select_own ON public.ai_hint_usage;
CREATE POLICY ai_hint_usage_select_own ON public.ai_hint_usage
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- All writes (INSERT / UPDATE via upsert) are performed by the server-side
-- admin client (getSupabaseAdminClient) which uses the service_role key and
-- bypasses RLS entirely. The anon key must never write to this table.
DROP POLICY IF EXISTS ai_hint_usage_write_service_role ON public.ai_hint_usage;
CREATE POLICY ai_hint_usage_write_service_role ON public.ai_hint_usage
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
