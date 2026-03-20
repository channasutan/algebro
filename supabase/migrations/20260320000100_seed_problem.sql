-- Seed a valid problem for Phase 3 practice flow
insert into public.problems (id, problem_latex, solution_latex, difficulty_level)
values (
  '11111111-1111-1111-1111-111111111111',
  '2x + 4 = 10',
  'x = 3',
  1
)
on conflict (id) do nothing;
