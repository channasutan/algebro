Database Schema

Overview

The platform uses Supabase PostgreSQL as the primary database.

Design principles:

- relational schema
- strong referential integrity
- scalable learning analytics
- support for PvP gameplay
- support for AI usage tracking
- support for SaaS billing
- optimized for Supabase Row Level Security

All user-owned tables enforce Row Level Security (RLS).

---

Identity

profiles

Stores user profile information.

Fields

id uuid primary key references auth.users(id) on delete cascade

username text unique
avatar_url text

xp integer default 0
level integer default 1

created_at timestamptz default now()

Indexes

index profiles_username_idx on username

---

Billing

subscriptions

Tracks user subscription status.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

plan_tier text
status text

current_period_end timestamptz

created_at timestamptz default now()

Plan tiers

free
premium

Status

active
cancelled
expired

Indexes

index subscriptions_user_idx on user_id

---

Learning Content

topics

Stores algebra topics.

Fields

id uuid primary key

name text unique

difficulty_level integer

Examples

linear_equations
quadratic_equations
factoring
systems_of_equations

---

problems

Stores algebra problems.

Fields

id uuid primary key

latex text

topic_id uuid references topics(id) on delete restrict

difficulty integer

template_version integer
validator_version integer

created_at timestamptz default now()

Indexes

index problems_topic_idx on topic_id

---

Problem Pool (PvP)

problem_pool

Pre-generated problems used in PvP matches.

Fields

id uuid primary key

problem_id uuid references problems(id) on delete restrict

topic_id uuid references topics(id) on delete restrict

difficulty integer

generator_seed text

status text

reserved_until timestamptz

created_at timestamptz default now()

Status

ready
reserved
used
invalid

Indexes

index problem_pool_status_idx on status
index problem_pool_matchmaking_idx on (status, topic_id, difficulty)

---

Practice System

practice_sessions

Tracks learning sessions.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

topic_id uuid references topics(id) on delete restrict

started_at timestamptz

completed_at timestamptz

Indexes

index practice_sessions_user_idx on user_id

---

attempts

Tracks a user solving a problem.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

problem_id uuid references problems(id) on delete restrict

practice_session_id uuid references practice_sessions(id) on delete cascade

status text

created_at timestamptz default now()

Status

in_progress
correct
incorrect
abandoned

Indexes

index attempts_user_idx on user_id
index attempts_problem_idx on problem_id

---

solution_steps

Stores each algebra step written by the student.

Fields

id uuid primary key

attempt_id uuid references attempts(id) on delete cascade

step_index integer

latex text

canonical_expression text

is_valid boolean

error_type text

created_at timestamptz default now()

Constraints

unique(attempt_id, step_index)

Indexes

index solution_steps_attempt_idx on attempt_id

---

Topic Progress

topic_progress

Tracks mastery per topic per user.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

topic_id uuid references topics(id) on delete restrict

mastery_score numeric

last_practiced_at timestamptz

Constraints

unique(user_id, topic_id)

Indexes

index topic_progress_user_idx on user_id

---

AI Tutor

ai_hint_usage

Tracks AI tutor usage.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

problem_id uuid references problems(id) on delete restrict

hint_count integer

created_at timestamptz default now()

Indexes

index ai_hint_usage_user_idx on user_id

---

PvP Duel System

duels

Stores PvP match metadata.

Fields

id uuid primary key

player1_id uuid references profiles(id) on delete restrict
player2_id uuid references profiles(id) on delete restrict

status text

winner_id uuid references profiles(id)

started_at timestamptz
ended_at timestamptz

Status

waiting
active
finished

Indexes

index duels_player1_idx on player1_id
index duels_player2_idx on player2_id

---

duel_rounds

Stores each round in a duel.

Fields

id uuid primary key

duel_id uuid references duels(id) on delete cascade

problem_id uuid references problems(id) on delete restrict

round_index integer

created_at timestamptz default now()

Constraints

unique(duel_id, round_index)

Indexes

index duel_rounds_duel_idx on duel_id

---

duel_answers

Stores answers submitted by players.

Fields

id uuid primary key

round_id uuid references duel_rounds(id) on delete cascade

player_id uuid references profiles(id) on delete restrict

answer_latex text

is_correct boolean

submitted_at timestamptz

Constraints

unique(round_id, player_id)

Indexes

index duel_answers_round_idx on round_id

---

Gamification

xp_events

Tracks XP gain events.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

event_type text

xp_amount integer

created_at timestamptz default now()

Examples

practice_complete
duel_win
daily_streak

Indexes

index xp_events_user_idx on user_id

---

badges

Stores achievement badges.

Fields

id uuid primary key

name text

description text

---

user_badges

Maps users to badges.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

badge_id uuid references badges(id) on delete restrict

earned_at timestamptz

Constraints

unique(user_id, badge_id)

Indexes

index user_badges_user_idx on user_id

---

Material Upload

materials

Stores user uploaded materials.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete cascade

title text

file_url text

status text

created_at timestamptz default now()

Status

uploaded
processing
processed
failed

Indexes

index materials_user_idx on user_id

---

material_topics

Topics extracted from uploaded material.

Fields

id uuid primary key

material_id uuid references materials(id) on delete cascade

topic_id uuid references topics(id) on delete restrict

confidence_score numeric

Indexes

index material_topics_material_idx on material_id

---

Background Jobs

jobs

Tracks asynchronous tasks.

Fields

id uuid primary key

job_type text

payload jsonb

status text

retry_count integer

visible_at timestamptz

created_at timestamptz default now()

completed_at timestamptz

Status

pending
running
completed
failed

Indexes

index jobs_status_idx on status

Worker pattern recommendation

Use "FOR UPDATE SKIP LOCKED" to safely process jobs concurrently.

---

Observability

api_logs

Stores API request logs.

Fields

id uuid primary key

user_id uuid references profiles(id) on delete set null

endpoint text

status_code integer

created_at timestamptz default now()

Indexes

index api_logs_user_idx on user_id

---

Relationships Overview

profiles
→ practice_sessions
→ attempts
→ solution_steps

profiles
→ topic_progress

profiles
→ duels
→ duel_answers

profiles
→ ai_hint_usage

materials
→ material_topics

problems
→ problem_pool

---

Security

All user-owned tables enforce Row Level Security.

Example policy

attempts.user_id = auth.uid()

---

Summary

The schema supports:

- algebra step validation
- adaptive learning curriculum
- AI tutoring limits
- PvP competitions
- gamification
- SaaS billing
- personalized learning materials
