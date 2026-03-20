-- Enable RLS for practice tables
alter table public.practice_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.solution_steps enable row level security;

-- practice_sessions policies
create policy "Users can insert own sessions"
on public.practice_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view own sessions"
on public.practice_sessions
for select
to authenticated
using (auth.uid() = user_id);

-- attempts policies
create policy "Users can insert own attempts"
on public.attempts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view own attempts"
on public.attempts
for select
to authenticated
using (auth.uid() = user_id);

-- solution_steps policies
create policy "Users can insert own steps"
on public.solution_steps
for insert
to authenticated
with check (exists (
  select 1 from public.attempts
  where public.attempts.id = public.solution_steps.attempt_id
  and public.attempts.user_id = auth.uid()
));

create policy "Users can view own steps"
on public.solution_steps
for select
to authenticated
using (exists (
  select 1 from public.attempts
  where public.attempts.id = public.solution_steps.attempt_id
  and public.attempts.user_id = auth.uid()
));
