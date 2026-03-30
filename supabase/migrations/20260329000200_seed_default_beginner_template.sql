-- Migration: seed default-beginner-template
-- Prereq: problem_templates table exists (created in 20260311150000_initial_database_baseline.sql)
-- Idempotent: ON CONFLICT (name) DO NOTHING
-- Constraint ref: problem_templates_name_unique
-- Template format note: renderTemplate() supports static LaTeX with no placeholders,
-- so '\frac{x}{y} = z' is valid for a non-parameterized seed template.

INSERT INTO public.problem_templates (
  name,
  template_latex,
  base_difficulty
)
VALUES (
  'default-beginner-template',
  '\frac{x}{y} = z',
  1
)
ON CONFLICT (name) DO NOTHING;
