CREATE TABLE material_topics (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id      uuid    REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
  topic_id         uuid    REFERENCES topics(id) ON DELETE RESTRICT NOT NULL,
  confidence_score numeric NOT NULL
                           CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX material_topics_material_idx ON material_topics(material_id);

ALTER TABLE material_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own material_topics via join"
  ON material_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_topics.material_id
        AND m.user_id = auth.uid()
    )
  );
