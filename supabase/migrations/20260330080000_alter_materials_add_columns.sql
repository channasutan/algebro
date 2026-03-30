-- Add title and status columns to existing materials table
-- The materials table was created in the initial baseline migration but is missing these columns
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS title       text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status      text        NOT NULL DEFAULT 'uploaded'
    CONSTRAINT materials_status_check
    CHECK (status IN ('uploaded', 'processing', 'processed', 'failed'));

-- Add confidence_score to existing material_topics table
-- The material_topics table was created in the initial baseline migration but is missing this column
ALTER TABLE public.material_topics
  ADD COLUMN IF NOT EXISTS confidence_score numeric
    CHECK (confidence_score >= 0 AND confidence_score <= 1);