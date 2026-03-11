create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.problem_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_latex text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.problem_templates (id) on delete set null,
  topic_id uuid,
  difficulty_level integer not null,
  problem_latex text not null,
  solution_latex text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.problem_pool (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems (id) on delete cascade,
  topic_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  topic_id uuid,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  is_correct boolean,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.solution_steps (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  step_index integer not null,
  step_latex text not null,
  is_valid boolean,
  error_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  topic_id uuid not null,
  mastery_score numeric(5,4) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, topic_id)
);

create table if not exists public.ai_hint_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete set null,
  feature_type text not null,
  token_usage integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.material_topics (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  topic_id uuid not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_type text not null,
  xp_amount integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references public.users (id) on delete cascade,
  player2_id uuid not null references public.users (id) on delete cascade,
  topic_id uuid,
  winner_id uuid references public.users (id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duel_rounds (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete restrict,
  round_number integer not null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (duel_id, round_number)
);

create table if not exists public.duel_answers (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.duels (id) on delete cascade,
  round_id uuid not null references public.duel_rounds (id) on delete cascade,
  player_id uuid not null references public.users (id) on delete cascade,
  answer_latex text,
  is_correct boolean,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, player_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan text not null,
  status text not null,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null default 'mayar',
  provider_payment_id text,
  amount numeric(12,2),
  currency text,
  status text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_problem_pool_problem_id on public.problem_pool (problem_id);
create index if not exists idx_practice_sessions_user_id on public.practice_sessions (user_id);
create index if not exists idx_attempts_session_id on public.attempts (session_id);
create index if not exists idx_attempts_problem_id on public.attempts (problem_id);
create index if not exists idx_attempts_user_id on public.attempts (user_id);
create index if not exists idx_solution_steps_attempt_id on public.solution_steps (attempt_id);
create index if not exists idx_topic_progress_user_id on public.topic_progress (user_id);
create index if not exists idx_ai_hint_usage_user_id on public.ai_hint_usage (user_id);
create index if not exists idx_ai_hint_usage_attempt_id on public.ai_hint_usage (attempt_id);
create index if not exists idx_materials_user_id on public.materials (user_id);
create index if not exists idx_material_topics_material_id on public.material_topics (material_id);
create index if not exists idx_xp_events_user_id on public.xp_events (user_id);
create index if not exists idx_duels_player1_id on public.duels (player1_id);
create index if not exists idx_duels_player2_id on public.duels (player2_id);
create index if not exists idx_duels_winner_id on public.duels (winner_id);
create index if not exists idx_duel_rounds_duel_id on public.duel_rounds (duel_id);
create index if not exists idx_duel_rounds_problem_id on public.duel_rounds (problem_id);
create index if not exists idx_duel_answers_duel_id on public.duel_answers (duel_id);
create index if not exists idx_duel_answers_round_id on public.duel_answers (round_id);
create index if not exists idx_duel_answers_player_id on public.duel_answers (player_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_payments_subscription_id on public.payments (subscription_id);
create index if not exists idx_payments_user_id on public.payments (user_id);
create index if not exists idx_jobs_status_created_at on public.jobs (status, created_at);

alter table public.users enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.solution_steps enable row level security;
alter table public.topic_progress enable row level security;
alter table public.ai_hint_usage enable row level security;
alter table public.materials enable row level security;
alter table public.material_topics enable row level security;
alter table public.xp_events enable row level security;
alter table public.duels enable row level security;
alter table public.duel_answers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
