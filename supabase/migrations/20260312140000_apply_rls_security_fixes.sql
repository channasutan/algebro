-- Migration: Apply security fixes to RLS policies
-- Fixes: restrict jobs to service_role, topics read-public write-service_role

BEGIN;

-- 1. Restrict jobs table - only service_role can read/write
-- Drop existing policies and recreate with proper restrictions

DROP POLICY IF EXISTS jobs_select_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_update_policy ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_policy ON public.jobs;

-- Only service_role can access jobs table
CREATE POLICY jobs_select_policy ON public.jobs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY jobs_insert_policy ON public.jobs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY jobs_update_policy ON public.jobs
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY jobs_delete_policy ON public.jobs
  FOR DELETE USING (auth.role() = 'service_role');

-- 2. Topics table - public read, service_role write
-- Drop existing policies and recreate

DROP POLICY IF EXISTS topics_select_policy ON public.topics;
DROP POLICY IF EXISTS topics_insert_policy ON public.topics;
DROP POLICY IF EXISTS topics_update_policy ON public.topics;
DROP POLICY IF EXISTS topics_delete_policy ON public.topics;

-- Public read access
CREATE POLICY topics_select_policy ON public.topics
  FOR SELECT USING (true);

-- Only service_role can insert
CREATE POLICY topics_insert_policy ON public.topics
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service_role can update
CREATE POLICY topics_update_policy ON public.topics
  FOR UPDATE USING (auth.role() = 'service_role');

-- Only service_role can delete
CREATE POLICY topics_delete_policy ON public.topics
  FOR DELETE USING (auth.role() = 'service_role');

COMMIT;
