System Modules

Overview

The system is implemented as a modular monolith.

Each module encapsulates a specific business domain and owns its internal logic and database tables.

> [!NOTE]
> Phase 1 focuses exclusively on establishing the shared infrastructure and adapter baseline. The core business logic and service implementations for the modules listed below are reserved for future phases.

Modules interact only through service interfaces (synchronous) or domain events (asynchronous).
Modules must never directly manipulate another module's database tables.

Architecture goals:

- strong domain boundaries
- explicit module contracts
- clear ownership of data
- isolated business logic
- scalable internal services

Core modules:

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

Practice Engine

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

Step Validation Engine

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

AI Tutor

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

Curriculum Engine

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

Problem Generator

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

PvP Duel Engine

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

Gamification Engine

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

Material Processing Engine

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

Billing & Subscription

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

Background Job System

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

Module Interaction Rules

Modules must follow these rules:

1. Modules cannot directly query tables owned by other modules.
2. Modules interact only through service APIs (sync) or domain events (async).
3. Database writes must happen only inside the owning module.
4. Domain events are used for side effects across modules.
5. Circular dependencies between modules are not allowed.

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
