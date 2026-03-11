# system-flow.md

# System Flow

## Overview

This document describes the **runtime system flows** of the platform.

It explains how modules interact during:

- algebra practice
- olympiad practice
- problem generation
- AI tutoring
- material processing
- gamification
- PvP duels
- billing

The platform follows a **modular monolith architecture** with an **event-driven internal communication model**.

High-level flow:

```
User
↓
Next.js UI
↓
API Route / Server Action
↓
Module Services
↓
Domain Events
↓
Other Modules React
↓
Database Updates
```

---

# 1. Practice Flow (Core Learning Loop)

The **practice flow** is the central interaction of the platform.

Users can practice problems from multiple sources:

- system generated problems
- olympiad / reasoning problems
- problems extracted from uploaded materials

User flow:

```
login
↓
choose practice mode
↓
start practice
↓
view problem
↓
submit solution steps
↓
receive validation
↓
continue solving
```

Practice modes:

```
Standard Practice
Olympiad Practice
Material-Based Practice
```

System flow:

```
User
↓
Next.js Practice Page
↓
API Route / Server Action
↓
Practice Engine
↓
Problem Source Resolver
↓
fetch problem
↓
return problem to UI
```

---

# 2. Problem Source Layer

Before generating or retrieving a problem, the system determines **where the problem should come from**.

```
Practice Engine
↓
Problem Source Resolver
↓
select source
```

Possible sources:

```
Template Problem Generator
LLM Problem Generator
Material Problem Library
```

---

# 3. Template Problem Generation (Standard Practice)

Used for regular algebra practice.

Generation pipeline:

```
Problem Generator
↓
select symbolic template
↓
randomize parameters
↓
generate symbolic equation
↓
verify using SymPy
↓
store problem in problem_pool
```

Example template:

```
a*x + b = c
```

Example generated equation:

```
7x + 3 = 31
```

SymPy verification:

```
solve(7*x + 3 - 31)
```

Ensures:

- solvable equation
- unique solution
- valid symbolic structure

Optional story generation:

```
LLM
↓
generate narrative context
```

Example:

```
A bookstore sells notebooks.
Each notebook costs x dollars.
If 7 notebooks plus a $3 shipping fee cost $31,
what is the price of one notebook?
```

---

# 4. Olympiad Problem Generation

Used for competition-level problems.

Flow:

```
Practice Engine
↓
LLM Problem Generator
↓
generate olympiad-style problem
↓
generate expected reasoning structure
↓
store problem
```

Typical olympiad problems include:

```
functional equations
number theory
proof-style algebra
advanced inequalities
```

These problems require **reasoning validation using the LLM validator**.

---

# 5. Material-Based Practice

Users can upload books or notes to generate practice problems.

Upload flow:

```
User
↓
upload material
↓
Material Processing Engine
↓
store file
↓
enqueue background job
```

Processing pipeline:

```
job worker
↓
text extraction
↓
LLM topic detection
↓
problem segmentation
↓
store extracted problems
```

Tables used:

```
materials
material_topics
problems
```

During practice:

```
Practice Engine
↓
fetch problem from material library
↓
return problem to UI
```

---

# 6. Step Validation Flow

The system validates student steps using a **hybrid validation engine**.

Validation pipeline:

```
Student Step
↓
Step Classifier
↓
symbolic step?
```

If symbolic:

```
Symbolic Validator
↓
CortexJS Compute Engine
↓
SymPy fallback
```

Example symbolic transformation:

```
2(x+3) → 2x + 6
```

If reasoning step:

```
LLM Reasoning Validator
↓
validate logical correctness
```

Examples of reasoning steps:

```
Let x = 0
Assume f(a) = f(b)
Therefore a = b
```

Validation result event:

```
step_validated
{
  attempt_id
  step_index
  is_valid
  error_type
}
```

---

# 7. AI Tutor Flow

The AI Tutor provides hints when students make mistakes.

Flow:

```
User submits step
↓
Step Validation Engine
↓
detectErrorType
↓
emit step_validated
```

If step is incorrect:

```
AI Tutor
↓
checkHintQuota(user)
↓
Gemini Flash API
↓
generate explanation
↓
return hint
```

AI input context:

```
problem
previous_step
current_step
error_type
```

Important rule:

```
AI must not reveal the final solution.
AI only explains mistakes and guides the student.
```

---

# 8. Gamification Flow

Gamification is triggered by domain events.

Example event:

```
attempt_completed
```

Flow:

```
attempt_completed
↓
Gamification Engine
↓
grantXP(user)
↓
update level
↓
check badge unlock
```

Tables:

```
xp_events
badges
user_badges
```

---

# 9. PvP Duel Flow (Post Launch)

The PvP system enables competitive algebra solving.

Matchmaking flow:

```
User joins queue
↓
PvP Duel Engine
↓
matchmaking
↓
create duel
```

Realtime communication:

```
Supabase Realtime
Channels:
lobby
duel:<duel_id>
```

Duel flow:

```
player submits answer
↓
validate answer
↓
determine round winner
↓
emit duel_finished
```

Gamification integration:

```
duel_finished
↓
grant XP
```

Tables:

```
duels
duel_rounds
duel_answers
```

---

# 10. Billing Flow

Billing controls feature access.

Example:

| Feature | Free | Premium |
|------|------|------|
| AI hints | limited | unlimited |
| advanced explanations | ❌ | ✅ |
| personalized curriculum | ❌ | ✅ |

Flow:

```
User action
↓
checkFeatureAccess(user)
↓
Billing Engine
↓
subscription status
```

Payment flow:

```
Stripe / Midtrans
↓
webhook event
↓
update subscriptions table
```

---

# 11. Event System Flow

Modules communicate through domain events.

Example:

```
attempt_completed
```

Event system flow:

```
module emits event
↓
event bus
↓
subscribed modules handle event
```

Example consumers:

```
Curriculum Engine
Gamification Engine
Analytics
```

Event infrastructure:

```
events/event-bus.ts
events/event-types.ts
```

---

# 12. Full System Architecture Flow

Complete runtime architecture:

```
User
↓
Next.js UI
↓
API Routes / Server Actions
↓
Modules

Practice Engine
Step Validation Engine
AI Tutor
Curriculum Engine
Problem Generator
Gamification Engine
Material Processing Engine
Billing Engine
PvP Engine

Shared Systems
↓
Event Bus
Job Queue
Infrastructure Clients
Database
```

---

# System Architecture Summary

The platform combines:

```
Next.js App Router
+
Modular Monolith Architecture
+
Event-Driven Internal System
+
Symbolic Math Engine (SymPy)
+
LLM Reasoning Validator
+
LLM Tutor (Gemini)
```

This architecture supports:

- scalable AI-assisted learning
- reliable symbolic math validation
- olympiad-level reasoning problems
- adaptive curriculum
- personalized practice
- competitive learning features
