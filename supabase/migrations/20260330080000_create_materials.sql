CREATE TABLE materials (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title       text        NOT NULL,
  file_url    text        NOT NULL,
  status      text        NOT NULL DEFAULT 'uploaded'
                          CONSTRAINT materials_status_check
                          CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX materials_user_idx ON materials(user_id);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own materials"
  ON materials FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
