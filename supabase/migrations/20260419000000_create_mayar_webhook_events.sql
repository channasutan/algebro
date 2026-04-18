-- Migration: create mayar_webhook_events table for idempotent webhook processing
-- Ref: https://supabase.com/docs/guides/deployment/managing-environments

CREATE TABLE IF NOT EXISTS public.mayar_webhook_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  text        NOT NULL,
  event_type   text        NOT NULL,
  payload      jsonb       NOT NULL DEFAULT '{}',
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Idempotency guard: prevent duplicate webhook replays via unique external_id
-- Ref: https://supabase.com/docs/guides/database/postgres/indexes
CREATE UNIQUE INDEX IF NOT EXISTS mayar_webhook_events_external_id_idx
  ON public.mayar_webhook_events (external_id);

-- Enable RLS: table is server-only (service role bypasses RLS by default)
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security
ALTER TABLE public.mayar_webhook_events ENABLE ROW LEVEL SECURITY;
