-- Migration: Fix critical Copilot review issues
-- Fixes: remove CHECK with subquery, add composite FK, ensure IF NOT EXISTS

BEGIN;

-- 1. Remove CHECK constraint with subquery (not supported by all DBs, inefficient)
-- Drop the CHECK constraint that contains a subquery

ALTER TABLE public.duel_answers DROP CONSTRAINT IF EXISTS duel_answers_round_duel_match;

-- 2. Add composite foreign key to enforce relational integrity
-- duel_answers(round_id, duel_id) references duel_rounds(id, duel_id)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'duel_rounds_id_duel_id_unique'
      AND conrelid = 'public.duel_rounds'::regclass
  ) THEN
    ALTER TABLE public.duel_rounds
      ADD CONSTRAINT duel_rounds_id_duel_id_unique UNIQUE (id, duel_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'duel_answers_round_duel_fkey'
      AND conrelid = 'public.duel_answers'::regclass
  ) THEN
    ALTER TABLE public.duel_answers
      ADD CONSTRAINT duel_answers_round_duel_fkey
      FOREIGN KEY (round_id, duel_id)
      REFERENCES public.duel_rounds (id, duel_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Ensure indexes use CREATE INDEX IF NOT EXISTS for idempotency
-- These may already exist from baseline, but we ensure they're present

CREATE INDEX IF NOT EXISTS idx_duel_rounds_duel_id ON public.duel_rounds (duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_answers_round_id ON public.duel_answers (round_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

COMMIT;
