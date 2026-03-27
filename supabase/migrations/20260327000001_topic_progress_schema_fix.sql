-- Migration: Fix topic_progress schema gaps
-- Idempotent: safe to run multiple times.
-- Does NOT recreate the table. Does NOT drop existing data.
-- Addresses three gaps found during schema verification:
--   1. Missing `last_practiced_at` column
--   2. Rename baseline index to canonical name `topic_progress_user_idx`
--   3. Missing FK on `topic_id` with ON DELETE RESTRICT

-- 1. Add `last_practiced_at` column if it does not yet exist.
--    Nullable so existing rows are unaffected.
ALTER TABLE public.topic_progress
  ADD COLUMN IF NOT EXISTS last_practiced_at timestamptz;

-- 2. Rename baseline index idx_topic_progress_user_id → canonical name topic_progress_user_idx.
--    No guard needed — Supabase CLI tracks migrations and runs each file exactly once.
ALTER INDEX public.idx_topic_progress_user_id
  RENAME TO topic_progress_user_idx;

-- 3. Add FK topic_id → topics(id) ON DELETE RESTRICT if topics table exists.
--    Simple and direct — migration runs exactly once via Supabase CLI.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'topics'
  ) THEN
    ALTER TABLE public.topic_progress
      ADD CONSTRAINT fk_topic_progress_topic_id
      FOREIGN KEY (topic_id)
      REFERENCES public.topics (id)
      ON DELETE RESTRICT;
  END IF;
END $$;