# Data Model

## Overview

This document describes the core database schema used by the platform.

The platform stores data related to:

- users
- practice sessions
- problem attempts
- solution steps
- generated problems
- uploaded learning materials
- subscriptions
- PvP duels
- AI usage tracking

The database runs on **Supabase PostgreSQL**.

All user-owned tables enforce **Row Level Security (RLS)**.

---

# Core Entities

Core entities of the system include:

users  
practice_sessions  
attempts  
solution_steps  
problems  
materials  
subscriptions  
duels  
ai_usage_logs  

Relationships overview:

User  
├── Practice Sessions  
│   └── Attempts  
│       └── Solution Steps  
│  
├── Materials  
│  
├── Subscriptions  
│  
└── PvP Duels  

---

# Users

Users represent registered platform accounts.

Table: `users`

Fields:

id (uuid)  
email (text)  
created_at (timestamp)  

Notes:

- Authentication handled by Supabase Auth
- `id` corresponds to `auth.users.id`

---

# Practice Sessions

A practice session represents a learning session focused on a specific topic.

Table: `practice_sessions`

Fields:

id (uuid)  
user_id (uuid)  
topic_id (uuid)  
started_at (timestamp)  
completed_at (timestamp)  

Relationships:

user_id → users.id

Purpose:

- track learning sessions
- group problem attempts

---

# Attempts

An attempt represents a user attempting to solve a problem.

Table: `attempts`

Fields:

id (uuid)  
session_id (uuid)  
problem_id (uuid)  
user_id (uuid)  
started_at (timestamp)  
completed_at (timestamp)  
is_correct (boolean)  

Relationships:

session_id → practice_sessions.id  
problem_id → problems.id  
user_id → users.id  

Purpose:

- track user progress
- store problem solving attempts

---

# Solution Steps

Solution steps represent each step submitted by the student.

Table: `solution_steps`

Fields:

id (uuid)  
attempt_id (uuid)  
step_index (integer)  
step_latex (text)  
is_valid (boolean)  
error_type (text)  
created_at (timestamp)  

Relationships:

attempt_id → attempts.id

Purpose:

- support step-by-step validation
- store student reasoning

---

# Problems

Problems represent math questions given to students.

Table: `problems`

Fields:

id (uuid)  
topic_id (uuid)  
difficulty_level (integer)  
problem_latex (text)  
solution_latex (text)  
created_at (timestamp)  

Sources of problems:

- AI generation
- problem templates
- extracted from uploaded materials

---

# Materials

Materials represent learning resources uploaded by users.

Table: `materials`

Fields:

id (uuid)  
user_id (uuid)  
file_name (text)  
file_url (text)  
uploaded_at (timestamp)  
processed_at (timestamp)  

Purpose:

- store user-uploaded learning content
- generate personalized practice questions

---

# Subscriptions

Subscriptions represent user billing plans.

Table: `subscriptions`

Fields:

id (uuid)  
user_id (uuid)  
plan (text)  
status (text)  
created_at (timestamp)  
expires_at (timestamp)  

Example plans:

free  
premium  

---

# PvP Duels

PvP duels represent real-time competitions between users.

Table: `duels`

Fields:

id (uuid)  
player1_id (uuid)  
player2_id (uuid)  
topic_id (uuid)  
winner_id (uuid)  
started_at (timestamp)  
finished_at (timestamp)  

Purpose:

- support competitive learning
- track match results

---

# AI Usage Logs

AI usage logs track AI requests for monitoring and cost control.

Table: `ai_usage_logs`

Fields:

id (uuid)  
user_id (uuid)  
feature_type (text)  
token_usage (integer)  
created_at (timestamp)  

Example feature types:

hint_generation  
problem_generation  
material_processing  
step_interpretation  

Purpose:

- monitor AI costs
- detect abuse
- analyze AI usage patterns

---

# Row Level Security (RLS)

User-owned tables enforce Row Level Security.

Example policy:

(select auth.uid()) = user_id

Tables protected by RLS:

practice_sessions  
attempts  
solution_steps  
materials  
subscriptions  
ai_usage_logs  

This ensures users can only access their own data.

---

# Future Extensions

The schema may expand to support:

- leaderboard rankings
- learning analytics
- spaced repetition systems
- adaptive difficulty tracking

These features can be added without breaking the core model.

---

# Summary

The data model supports:

- step-by-step problem solving
- AI-assisted tutoring
- personalized practice generation
- user-uploaded learning materials
- subscription-based access
- competitive PvP learning

The schema is intentionally simple to support MVP development while allowing future expansion.
