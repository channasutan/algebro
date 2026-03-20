System Modules

Overview

The system is implemented as a modular monolith.

Each module encapsulates a specific business domain and owns its internal logic and database tables.

> [!NOTE]
> Phase 1 focuses exclusively on establishing the shared infrastructure and adapter baseline. The core business logic and service implementations for the modules listed below are reserved for future phases.

> [!NOTE]
> Phase 2 Task 3 adds the `authentication` and `user-profiles` module scaffolds plus `modules/bootstrap.ts`.
> This task defines public contracts and domain shapes only. Service and repository implementations arrive in later Phase 2 tasks.

> [!IMPORTANT]
> `modules/bootstrap.ts` is the server bootstrap contract for the modular monolith.
> Server entry points such as route handlers, server actions, job startup, and
> other server-only integration boundaries must call
> `ensureModulesBootstrapped()` before they invoke module services.
> It is idempotent and exists to prevent duplicate job registrations or event
> subscriber wiring as Phase 2 adds more runtime behavior.

Modules interact only through service interfaces (synchronous) or domain events (asynchronous).
Modules must never directly manipulate another module's database tables.

Architecture goals:

- strong domain boundaries
- explicit module contracts
- clear ownership of data
- isolated business logic
- scalable internal services

Core modules:

- Authentication
- User Profiles
- Practice Engine
- Step Validation Engine
- AI Tutor
- Curriculum Engine
- Problem Generator
- PvP Duel Engine
- Gamification Engine
- Material Processing Engine
- Billing & Subscription
- Background Job System

---

## Authentication

Scaffold Shape

`index.ts`
`contracts/sign-up.ts`
`contracts/sign-in.ts`
`contracts/session.ts`
`domain/auth-session.ts`

Responsibilities

Owns sign-up, sign-in, sign-out, session lookup, and auth callback orchestration.

Identity Source

Supabase Auth-managed `auth.users`

Owned Tables

None in `public`

Public API

signUp(email, password)

signIn(email, password)

signOut()

getSession()

handleAuthCallback()

> [!NOTE]
> Authentication services use the repository injection pattern. This prevents developers from importing internal repository factories directly.
> 
> Example usage:
> ```typescript
> const repo = buildAuthRepository(cookieStore)
> await signUpUser(input, repo)
> ```

Events Emitted

auth_user_registered

Invariants

- `auth.users` remains the source of identity truth
- Authentication must not write directly to `public.users`

---

## User Profiles

Scaffold Shape

`index.ts`
`contracts/get-profile.ts`
`contracts/update-profile.ts`
`domain/profile.ts`

Responsibilities

Owns profile bootstrap, profile reads, and profile updates for authenticated users.

Owned Tables

public.users

Public API

getCurrentProfile(user_id)

initializeProfile(user_id, email)

updateProfile(user_id, changes)

Events Consumed

auth_user_registered

Events Emitted

user_profile_initialized
user_profile_updated

Invariants

- `public.users` is the canonical profile aggregate for application data
- profile initialization must be idempotent across event-driven and lazy bootstrap paths
- other modules may reference `public.users` through foreign keys but must not mutate it directly

---

## Practice Engine

Responsibilities

Manages algebra practice sessions and student attempts.

Responsibilities:

- start practice sessions
- fetch practice problems
- record attempts
- store algebra steps
- emit learning events
- trigger gamification updates

Owned Tables

practice_sessions
attempts
solution_steps

Public API

startPracticeSession(user_id, topic_id)

submitStep(attempt_id, latex_step)

completeAttempt(attempt_id)

getNextProblem(user_id, topic_id)

Dependencies

Step Validation Engine
Curriculum Engine
Gamification Engine

Forbidden Access

Cannot directly update:

topic_progress
xp_events

These must be handled by their owning modules.

Events Emitted

step_submitted
attempt_completed

Event Contract

attempt_completed

{
user_id,
topic_id,
attempt_id,
result,
completed_at
}

Events Consumed

step_validated

Invariants

- A user can only have one active attempt per problem
- step_index must increase sequentially
- attempts must belong to a valid practice_session

---

## Step Validation Engine

Responsibilities

Validates algebra transformations between student steps.

Engines

Primary

CortexJS Compute Engine (client-side)

Fallback

SymPy microservice

Validation Pipeline

LaTeX input
→ expression parsing
→ AST generation
→ canonicalization
→ equivalence detection

Example

2(x+3) → 2x + 6

Public API

validateStep(previous_expression, next_expression)

detectErrorType(previous_expression, next_expression)

canonicalize(expression)

Dependencies

SymPy microservice

Events Emitted

step_validated

Event Contract

step_validated

{
attempt_id,
step_index,
is_valid,
error_type
}

Events Consumed

step_submitted

Invariants

- Expressions must be canonicalized before validation
- Validation must not mutate database state

---

## AI Tutor

Responsibilities

Provides AI-based explanations and hints.

AI model

Gemini Flash

Constraints

AI must not directly solve problems.

AI only explains detected mistakes.

Pipeline

Student step
→ validation result
→ error classification
→ hint generation

Owned Tables

ai_hint_usage

Public API

generateHint(problem_id, step_context)

checkHintQuota(user_id)

Dependencies

Step Validation Engine
Billing & Subscription

Forbidden Access

Cannot modify attempts or solution_steps.

Events Consumed

step_validated

Invariants

- AI hints must respect usage quota
- AI responses must never reveal final answers

---

## Curriculum Engine

Responsibilities

Determines learning progression and adaptive difficulty.

Inputs

topic mastery
error patterns
practice history

Outputs

recommended next problem

Owned Tables

topic_progress

Public API

getRecommendedProblem(user_id)

updateMastery(user_id, topic_id)

calculateMasteryScore(user_id, topic_id)

Dependencies

Problem Generator

Events Consumed

attempt_completed

Invariants

- mastery_score must remain within range [0,1]
- mastery updates must be idempotent

---

## Problem Generator

Responsibilities

Creates algebra problems using templates.

Generation Method

template library

+ parameter randomization
+ symbolic validation

Example template

a*x + b = c

Owned Tables

problems
problem_pool

Public API

generateProblem(template_id)

populateProblemPool(topic_id)

reserveProblemForDuel(topic_id)

Dependencies

Step Validation Engine

Events Emitted

problem_generated

Event Contract

problem_generated

{
problem_id,
topic_id,
difficulty,
generated_at
}

Invariants

- Generated problems must be solvable
- Difficulty must match template configuration

---

## PvP Duel Engine

Responsibilities

Handles real-time competitive algebra solving.

Flow

player joins queue
→ matchmaking
→ duel created
→ rounds executed
→ winner determined

Realtime communication

Supabase Realtime

Channels

lobby
duel:<duel_id>

Owned Tables

duels
duel_rounds
duel_answers

Public API

joinMatchmaking(user_id)

createDuel(player1, player2)

submitAnswer(duel_id, player_id)

finalizeRound(round_id)

Dependencies

Problem Generator
Gamification Engine

Events Emitted

duel_started
duel_round_completed
duel_finished

Event Contracts

duel_started

{
duel_id,
player1_id,
player2_id,
started_at
}

duel_finished

{
duel_id,
winner_id,
player1_id,
player2_id,
finished_at
}

Invariants

- Each duel can only have one active round
- Each player can submit only one answer per round

---

## Gamification Engine

Responsibilities

Tracks engagement rewards.

Rewards include

XP
levels
badges

Owned Tables

xp_events
badges
user_badges

Public API

grantXP(user_id, event_type)

awardBadge(user_id, badge_id)

calculateLevel(user_id)

Events Consumed

attempt_completed
duel_finished

Invariants

- XP events must be append-only
- Badge assignments must be unique per user

---

## Material Processing Engine

Responsibilities

Processes user-uploaded learning materials.

Supported formats

PDF
text
LaTeX

Processing Pipeline

upload
→ text extraction
→ AI topic extraction
→ topic mapping
→ personalized curriculum

Owned Tables

materials
material_topics

Public API

uploadMaterial(user_id)

processMaterial(material_id)

extractTopics(material_id)

Dependencies

AI Tutor
Curriculum Engine

Events Emitted

material_uploaded
material_processed

Event Contracts

material_uploaded

{
material_id,
user_id,
uploaded_at
}

material_processed

{
material_id,
topics_detected,
processed_at
}

---

## Billing & Subscription

Responsibilities

Controls feature access based on subscription.

Supported tiers

free
premium

Owned Tables

subscriptions

Public API

getUserPlan(user_id)

checkFeatureAccess(user_id, feature)

handleWebhookEvent(event)

Dependencies

Payment providers

Mayar
Midtrans
Xendit

Invariants

- A user can only have one active subscription
- Feature access must derive from subscription status

---

## Background Job System

Responsibilities

Executes asynchronous tasks.

Examples

material processing
problem generation
analytics

Owned Tables

jobs

Worker Pattern

SELECT jobs
FOR UPDATE SKIP LOCKED

Public API

enqueueJob(type, payload)

processJob(job_id)

retryJob(job_id)

Invariants

- Jobs must be idempotent
- Failed jobs must support retry

---

Creating New Modules

Use the scaffold command to generate a new module with the correct structure:

node scripts/scaffold-module.mjs <kebab-case-module-name>

Example:

node scripts/scaffold-module.mjs practice-engine

This creates a complete module structure at modules/practice-engine/ with:
- contracts/ (split by use case)
- domain/ (optional entities)
- services/ (business logic, no supabase imports)
- repositories/ (data access, supabase isolated here)
- events/ (event handler registration placeholder)
- tests/ (unit tests)

Architecture Decisions

When building features, choose the right pattern:

Events
- Use for: cross-module side effects, async workflows
- Example: Gamification reacts to attempt_completed events

Jobs
- Use for: background processing, long-running tasks
- Example: Material processing, AI topic extraction

Server Actions
- Use for: first-party UI mutations
- Example: Form submissions, profile updates

Route Handlers
- Use for: external webhooks, API consumers
- Example: Payment webhooks from Mayar

---

Module Interaction Rules

Modules must follow these rules:

1. Modules cannot directly query tables owned by other modules.
2. Modules interact only through service APIs (sync) or domain events (async).
3. Database writes must happen only inside the owning module.
4. Domain events are used for side effects across modules.
5. Circular dependencies between modules are not allowed.

### Repository Naming Convention

Internal module repositories must follow this naming convention:
`supabase-[aggregate]-repository.ts`

Examples:
- `supabase-auth-repository.ts`
- `supabase-profile-repository.ts`

Example interaction

User submits algebra step

API Route
→ Practice Engine
→ Step Validation Engine (service call)

Practice Engine emits event

attempt_completed

Event consumers

→ Curriculum Engine (update mastery)
→ Gamification Engine (grant XP)

---

Summary

The modular architecture separates system responsibilities into isolated domains:

Authentication
User Profiles
Practice
Validation
AI Tutoring
Curriculum
Problem Generation
PvP Gameplay
Gamification
Material Processing
Billing

This design enables rapid iteration while maintaining strict architectural boundaries and scalability.
