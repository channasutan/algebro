-- Extend existing materials table with title, status, and file_name alias
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS title  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded'
    CONSTRAINT materials_status_check
    CHECK (status IN ('uploaded', 'processing', 'processed', 'failed'));

-- Extend existing material_topics with confidence_score
ALTER TABLE public.material_topics
  ADD COLUMN IF NOT EXISTS confidence_score numeric
    CHECK (confidence_score >= 0 AND confidence_score <= 1);
