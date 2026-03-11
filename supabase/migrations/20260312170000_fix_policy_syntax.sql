-- Migration: Fix CREATE POLICY IF NOT EXISTS syntax
-- PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS
-- Use DROP POLICY IF EXISTS + CREATE POLICY instead

BEGIN;

-- Fix topics policies
DROP POLICY IF EXISTS topics_select_policy ON public.topics;
DROP POLICY IF EXISTS topics_insert_policy ON public.topics;
DROP POLICY IF EXISTS topics_update_policy ON public.topics;
DROP POLICY IF EXISTS topics_delete_policy ON public.topics;

CREATE POLICY topics_select_policy ON public.topics FOR SELECT USING (true);
CREATE POLICY topics_insert_policy ON public.topics FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY topics_update_policy ON public.topics FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY topics_delete_policy ON public.topics FOR DELETE USING (auth.role() = 'service_role');

-- Fix duel_rounds policies
DROP POLICY IF EXISTS duel_rounds_select_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_insert_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_update_policy ON public.duel_rounds;
DROP POLICY IF EXISTS duel_rounds_delete_policy ON public.duel_rounds;

CREATE POLICY duel_rounds_select_policy ON public.duel_rounds FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY duel_rounds_insert_policy ON public.duel_rounds FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY duel_rounds_update_policy ON public.duel_rounds FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY duel_rounds_delete_policy ON public.duel_rounds FOR DELETE USING (auth.role() = 'service_role');

-- Fix jobs policies
DROP POLICY IF EXISTS jobs_select_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_update_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_policy ON public.jobs;

CREATE POLICY jobs_select_policy ON public.jobs FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY jobs_insert_policy ON public.jobs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY jobs_update_policy ON public.jobs FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY jobs_delete_policy ON public.jobs FOR DELETE USING (auth.role() = 'service_role');

COMMIT;
