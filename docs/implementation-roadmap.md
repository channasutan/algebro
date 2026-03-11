Implementation Roadmap

Overview

This document defines the development roadmap for the platform.

Goals:

- build the system incrementally
- deliver usable features early
- maintain architectural boundaries
- enable fast iteration with AI-assisted development

Development strategy combines:

- modular monolith architecture
- vertical feature slices

This allows stable architecture while delivering usable features quickly.

Development principle:

core learning → personalization → engagement → monetization

---

Testing Strategy

Testing is executed in every phase.

Testing types:

- domain unit tests
- service tests
- repository integration tests
- API tests
- end-to-end flow tests

Automated testing is executed using TestSprite.

Rule:

A phase is complete only when all tests pass.

Testing ensures safe AI-assisted development and prevents regression.

---

Phase 0 — Project Setup

Goal: initialize the base project.

Tasks:

Initialize Next.js App Router project.

Create architecture structure defined in:

folder-structure.md

Setup tooling:

- TypeScript
- ESLint
- Prettier

Create directories:

app/
modules/
lib/
infrastructure/
events/
jobs/
config/
docs/

Setup environment configuration.

Example:

config/env.ts

Setup Supabase client.

Example:

lib/supabase/db.ts

Deliverables:

- working Next.js project
- Supabase connection
- environment configuration

Testing:

Verify:

- project builds
- environment variables load
- Supabase connection works

---

Phase 1 — Core Infrastructure

Goal: implement shared system infrastructure.

Tasks:

Implement event bus.

events/event-bus.ts

Implement job queue runner.

jobs/job-runner.ts

Setup infrastructure clients:

infrastructure/ai/gemini-client.ts
infrastructure/sympy/sympy-client.ts
infrastructure/payments/stripe-client.ts
infrastructure/realtime/supabase-realtime.ts

Deliverables:

- event system operational
- infrastructure clients ready
- background job interface ready

Testing:

Test:

- event publishing
- event subscription
- infrastructure connectivity

---

Phase 2 — Authentication & Profiles

Goal: implement user identity.

Tasks:

Setup Supabase Auth.

Create profile system.

Tables:

profiles

Features:

- user signup
- login
- session handling
- profile initialization

Deliverables:

Users can authenticate and access the platform.

Testing:

Test:

- signup flow
- login flow
- session persistence
- profile creation

---

Phase 3 — Vertical Slice 1: Basic Practice Loop

Goal: deliver the first usable learning feature.

Modules involved:

Practice Engine
Step Validation Engine (minimal)

User flow:

login
→ start practice
→ view problem
→ submit algebra step
→ validation result

Tasks:

Implement tables:

practice_sessions
attempts
solution_steps

Implement services:

startPracticeSession()

submitStep()

Implement basic validation.

Deliverables:

Users can solve algebra problems step-by-step.

Testing:

Test:

- practice session flow
- step submission
- validation responses
- API endpoints

---

Phase 4 — Step Validation Engine (Full)

Goal: implement robust algebra validation.

Tasks:

Integrate:

CortexJS Compute Engine.

Add fallback validation using:

SymPy microservice.

Implement services:

validateStep()

detectErrorType()

canonicalize()

Deliverables:

Accurate algebra step validation.

Example:

2(x+3) → 2x + 6

Testing:

Test:

- correct transformations
- incorrect step detection
- canonical normalization

---

Phase 5 — Problem Generator

Goal: generate unlimited algebra problems.

Modules:

Problem Generator

Tasks:

Implement templates.

Example:

a*x + b = c

Add parameter randomization.

Validate generated problems using SymPy.

Populate:

problem_pool

Deliverables:

The system can generate unlimited problems.

Testing:

Test:

- template correctness
- parameter randomization
- solvability validation

---

Phase 6 — Curriculum Engine

Goal: adaptive learning.

Modules:

Curriculum Engine

Tasks:

Implement table:

topic_progress

Implement logic:

calculateMasteryScore()

updateMastery()

getRecommendedProblem()

Subscribe to event:

attempt_completed

Deliverables:

Difficulty adapts based on mastery.

Testing:

Test:

- mastery score calculation
- mastery update
- problem recommendation

---

Phase 7 — Material Processing Engine

Goal: personalized learning from uploaded materials.

Modules:

Material Processing Engine

Tasks:

Implement material upload.

Supported formats:

- PDF
- text
- LaTeX

Pipeline:

upload
→ text extraction
→ AI topic detection
→ topic mapping

Tables:

materials
material_topics

Deliverables:

Users receive personalized practice from their materials.

Testing:

Test:

- file upload
- extraction pipeline
- topic detection

---

Phase 8 — AI Tutor

Goal: provide explanations and hints.

Modules:

AI Tutor

Tasks:

Integrate Gemini Flash API.

Implement:

generateHint()

checkHintQuota()

Hints based on:

- incorrect algebra steps
- validation errors

Deliverables:

Students receive AI hints during practice.

Testing:

Test:

- hint generation
- quota limits
- response safety

---

Phase 9 — Gamification Engine

Goal: improve engagement.

Modules:

Gamification Engine

Tasks:

Implement tables:

xp_events
badges
user_badges

Grant XP when:

attempt_completed
duel_finished

Implement:

grantXP()

awardBadge()

Deliverables:

Users gain:

- XP
- levels
- badges

Testing:

Test:

- XP events
- badge assignment

---

Phase 10 — PvP Duel Engine (Post-Launch)

Goal: enable competitive learning.

Modules:

PvP Duel Engine

Tasks:

Implement tables:

duels
duel_rounds
duel_answers

Implement matchmaking.

Use Supabase Realtime.

Channels:

lobby
duel:<duel_id>

Deliverables:

Real-time algebra duel system.

Testing:

Test:

- duel creation
- round progression
- answer submission

---

Phase 11 — Billing & Subscription

Goal: monetization.

Modules:

Billing & Subscription

Tasks:

Integrate:

Stripe
Midtrans (optional)

Implement table:

subscriptions

Implement:

checkFeatureAccess()

Feature gating:

- AI hints
- advanced explanations
- personalized curriculum

Deliverables:

Free vs premium subscription system.

Testing:

Test:

- subscription updates
- feature access rules
- webhook handling

---

Phase 12 — Observability & Stability

Goal: production readiness.

Tasks:

Add:

- logging
- monitoring
- rate limiting
- error tracking

Optimize database queries.

Deliverables:

Stable production system.

Testing:

Test:

- error handling
- performance under load

---

MVP Scope

Launch-ready MVP includes:

Phase 0 → Phase 8

This delivers:

- step-by-step algebra solving
- symbolic validation
- adaptive curriculum
- AI tutoring
- personalized learning materials

---

Final System Capabilities

After all phases:

- step-by-step algebra solving
- symbolic validation
- AI tutoring
- adaptive curriculum
- personalized learning
- gamification
- PvP competitions
- SaaS subscription model
