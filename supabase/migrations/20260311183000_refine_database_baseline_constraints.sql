drop index if exists public.idx_duel_rounds_duel_id;
drop index if exists public.idx_duel_answers_round_id;
drop index if exists public.idx_subscriptions_user_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'problem_templates_name_unique'
      and conrelid = 'public.problem_templates'::regclass
  ) then
    alter table public.problem_templates
      add constraint problem_templates_name_unique unique (name);
  end if;
end $$;
