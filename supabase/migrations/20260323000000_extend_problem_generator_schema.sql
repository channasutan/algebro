-- Migration: Extend problem generator schema for Phase 5
-- Adds parameter storage and validation tracking fields

-- Add parameter_schema to problem_templates for defining randomizable parameters
alter table public.problem_templates
  add column if not exists parameter_schema jsonb default null;

-- Add base_difficulty to problem_templates for template difficulty baseline
alter table public.problem_templates
  add column if not exists base_difficulty integer default 1;

alter table public.problem_templates
  drop constraint if exists chk_base_difficulty_range;

alter table public.problem_templates
  add constraint chk_base_difficulty_range
  check (base_difficulty >= 1 and base_difficulty <= 5);

-- Add parameters to problems for storing generated parameter values
alter table public.problems
  add column if not exists parameters jsonb default null;

-- Add is_validated to problems for tracking SymPy validation status
alter table public.problems
  add column if not exists is_validated boolean default false;

-- Create GIN index on parameter_schema for efficient JSON queries
create index if not exists idx_problem_templates_parameter_schema 
  on public.problem_templates using gin (parameter_schema);

-- Create index on base_difficulty for filtering by difficulty
create index if not exists idx_problem_templates_base_difficulty 
  on public.problem_templates (base_difficulty);

-- Create index on is_validated for filtering validated problems
create index if not exists idx_problems_is_validated 
  on public.problems (is_validated);

comment on column public.problem_templates.parameter_schema is 'JSON schema defining randomizable parameters (e.g., { "a": { "type": "int", "min": 1, "max": 10 } })';
comment on column public.problem_templates.base_difficulty is 'Baseline difficulty level (1-5) for this template';
comment on column public.problems.parameters is 'Generated parameter values used for this problem instance (e.g., { "a": 3, "b": 7 })';
comment on column public.problems.is_validated is 'Whether this problem has been validated as solvable by SymPy';
