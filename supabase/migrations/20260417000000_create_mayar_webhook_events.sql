CREATE TABLE IF NOT EXISTS mayar_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mayar_webhook_events_external_id ON mayar_webhook_events(external_id);
CREATE INDEX idx_mayar_webhook_events_event_type ON mayar_webhook_events(event_type);
CREATE INDEX idx_mayar_webhook_events_created_at ON mayar_webhook_events(created_at);
