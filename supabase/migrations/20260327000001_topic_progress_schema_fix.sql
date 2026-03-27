-- Migration: Fix topic_progress schema gaps
-- Idempotent: safe to run multiple times.
-- Does NOT recreate the table. Does NOT drop existing data.
-- Addresses three gaps found during schema verification:
--   1. Missing `last_practiced_at` column
--   2. Missing canonical index name `topic_progress_user_idx`
--   3. Missing FK on `topic_id` with ON DELETE RESTRICT

-- 1. Add `last_practiced_at` column if it does not yet exist.
--    Nullable so existing rows are unaffected.
ALTER TABLE public.topic_progress
  ADD COLUMN IF NOT EXISTS last_practiced_at timestamptz;

-- 2. Add canonical index `topic_progress_user_idx` on user_id.
--    The baseline already created `idx_topic_progress_user_id`; this adds the
--    explicitly expected name without dropping the old one (both are fine).
CREATE INDEX IF NOT EXISTS topic_progress_user_idx
  ON public.topic_progress (user_id);

-- 3. Add FK on topic_id → topics(id) ON DELETE RESTRICT.
--    `topics` table must exist. The constraint is named explicitly so it is
--    idempotent via DO $$ ... END $$.
DO $$
BEGIN
  -- Only add the FK if no FK constraint already references topic_id on this table.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = rc.constraint_name
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name   = 'topic_progress'
      AND kcu.column_name  = 'topic_id'
  ) THEN
    -- Only add if the `topics` table actually exists.
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
  END IF;
END $$;
