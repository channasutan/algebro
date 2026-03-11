AI Algebra Platform — System Architecture

1. Product Overview

AI Algebra Platform adalah SaaS edtech untuk latihan aljabar step-by-step dengan AI tutor dan mode PvP duel.

Tujuan platform:

- membantu siswa memahami langkah algebra
- memberikan hint berbasis AI
- menyediakan latihan adaptif
- menyediakan kompetisi matematika realtime
- memungkinkan personalisasi melalui materi yang diupload user

Target skala awal:

0–5000 MAU dengan free-tier infrastructure.

---

2. Technology Stack

Frontend

Next.js (App Router)
React
TypeScript
TanStack Query
Tailwind CSS

Math Interface

MathLive — math input editor
KaTeX — math rendering

Backend

Next.js API routes
Server Actions

Database

Supabase PostgreSQL
Supabase Auth
Supabase Realtime

Math Engine

CortexJS Compute Engine (primary symbolic engine)
SymPy microservice (advanced symbolic math)

AI

Gemini Flash API

AI digunakan untuk:

- tutoring hints
- topic extraction dari materi user

AI tidak digunakan untuk step validation.

Infrastructure

Vercel — application hosting
Supabase — database & realtime
Render — math microservice

---

3. Observability Layer (GitHub Student Pack)

Platform menggunakan tools observability berikut:

Sentry

Digunakan untuk:

- error monitoring
- frontend crash tracking
- API failure tracking

New Relic

Digunakan untuk:

- performance monitoring
- API latency
- database performance

Observability architecture:

Application
→ Sentry error reporting
→ New Relic performance monitoring

---

4. Machine Learning Research Layer

Deepnote digunakan sebagai ML experimentation environment.

Digunakan untuk:

- analyzing learning data
- training recommendation models
- improving curriculum algorithms

Pipeline:

Supabase data export
→ Deepnote notebooks
→ ML experiments
→ improved learning models.

---

5. High Level Architecture

Client Layer

Browser application running React UI and math editor.

Application Layer

Next.js application handling:

routing
API endpoints
business logic.

Core modules:

Practice Engine
PvP Duel Engine
AI Tutor
Gamification Engine
Curriculum Engine
Problem Generator
Material Processing Engine.

Data Layer

Supabase PostgreSQL database with realtime channels.

Math Layer

Symbolic math engines for expression parsing and validation.

AI Layer

LLM used only for tutoring and topic extraction.

---

6. Core System Modules

Practice Engine

Handles step-by-step algebra solving.

Flow:

Math input
→ step validation
→ AI hint
→ progress storage.

Responsibilities:

- parse student steps
- detect transformation rules
- update learning progress.

---

Step Validation Engine

Validates algebra transformations.

Pipeline:

LaTeX input
→ expression parser
→ expression tree
→ canonicalization
→ equivalence detection.

Handled transformations:

expand
simplify
add/subtract both sides
multiply/divide both sides.

---

Math Engine

Primary engine:

CortexJS Compute Engine.

Responsibilities:

- symbolic algebra
- canonicalization
- simplification
- equation solving.

Fallback engine:

SymPy microservice.

Used for:

advanced algebra
calculus
linear algebra.

---

AI Tutor

LLM model:

Gemini Flash.

Purpose:

- explain mistakes
- provide hints
- guide student thinking.

Constraints:

AI must not directly solve the problem.

Input context:

problem statement
student step history
detected error type.

---

PvP Duel Engine

Realtime competitive math solving.

Flow:

join queue
→ matchmaking
→ duel room
→ rounds
→ winner.

Realtime synchronization handled by Supabase Realtime.

Events:

match_found
round_start
answer_submitted
result_reveal.

---

Gamification Engine

Tracks engagement.

Events:

practice completed
duel win
daily login.

Rewards:

XP
levels
badges
leaderboards.

---

Curriculum Engine

Adaptive learning system.

Inputs:

practice results
mistake patterns
topic mastery.

Outputs:

next recommended problem.

Mastery score range:

0.0 – 1.0.

Difficulty adjusts dynamically.

---

Problem Generator

Generates practice problems.

Method:

template library

+ parameter randomization
+ symbolic solver validation.

Example template:

a*x + b = c

Generator ensures:

valid equations
predictable difficulty
integer solutions.

---

Material Processing Engine

Allows users to upload learning materials.

Supported formats:

PDF
text notes
LaTeX notes.

Processing pipeline:

Upload
→ text extraction
→ LLM topic extraction
→ concept graph
→ curriculum mapping
→ personalized practice generation.

LLM extracts topics but does not generate practice problems directly.

---

7. Data Architecture

Database provider:

Supabase PostgreSQL.

Key data domains:

users
questions
practice sessions
duels
learning analytics
AI tutoring
user materials.

Security enforced using:

Supabase Row Level Security.

Users can only access their own data.

---

8. Realtime Architecture

Realtime communication implemented using Supabase Realtime.

Channels:

lobby
duel:<duel_id>

Used for:

matchmaking
duel events
timer synchronization.

---

9. Performance Strategy

Math validation runs primarily in the browser using CortexJS.

Server responsibilities:

data persistence
AI hints
duel synchronization.

Client caching handled by TanStack Query.

---

10. Learning Data Flywheel

System continuously collects learning data:

student solution steps
error patterns
hint usage
solve time.

Data improves:

AI tutoring
curriculum difficulty
problem selection.

---

11. Math Compute Pipeline

Overview

The platform performs most algebra computation directly in the browser to reduce latency and infrastructure cost.

A hybrid compute architecture is used:

- Client-side symbolic math engine
- Server-side fallback for advanced computations

This design allows the system to scale efficiently while maintaining fast response times for interactive step-by-step learning.

---

Design Principle

The primary rule of the compute architecture:

Most algebra computations should run on the client side whenever possible.

Server-side compute is used only when necessary.

Benefits:

- low latency
- reduced server load
- lower infrastructure cost
- better scalability

---

Client-Side Compute Layer

Client-side math processing is handled using:

CortexJS Compute Engine

Capabilities:

- parse algebra expressions
- simplify expressions
- canonicalize expressions
- validate algebra transformations
- detect equivalence between expressions

Example transformation handled in the browser:

[
2(x+3) = 10
]

Student step:

[
2x + 6 = 10
]

The engine expands the expression and confirms the step is valid.

---

Expression Processing Pipeline

Math expressions follow the pipeline below:

MathLive Input
→ Expression Parser
→ Abstract Syntax Tree (AST)
→ Canonicalization
→ Step Validation
→ Result

Canonicalization ensures equivalent expressions are treated the same.

Example:

[
2(x+3)
]

and

[
2x+6
]

both normalize to the same canonical form.

---

Server-Side Compute Layer

Server-side symbolic computation is used for advanced operations.

Fallback engine:

SymPy microservice

Server compute is used when:

- expressions exceed browser compute limits
- advanced symbolic solving is required
- calculus operations appear
- linear algebra operations are required

Pipeline:

Client Request
→ Next.js API Route
→ SymPy Microservice
→ Result Returned

---

AI Tutor Interaction

AI tutors do not perform algebra computation.

Instead, they operate on validated math steps.

Pipeline:

Student Step
→ Step Validator
→ Error Detection
→ AI Tutor Prompt
→ Hint Generated

Input to the AI tutor includes:

- original problem
- student step history
- detected error type

The tutor generates hints without solving the problem directly.

---

Compute Cost Strategy

Compute distribution target:

80–90% client-side computation
10–20% server-side computation

This dramatically reduces infrastructure cost and ensures scalability.

---

PvP Duel Compute Strategy

In PvP matches:

Step validation occurs in the browser for speed.

The server only performs final verification and score updates.

Pipeline:

Player Input
→ Client Validation
→ Server Verification
→ Score Update

---

Performance Impact

Without client-side compute:

All math operations must run on the server.

Consequences:

- higher latency
- increased infrastructure cost
- reduced scalability

With hybrid compute:

Most operations run locally in the browser.

Benefits:

- near-instant feedback
- minimal server load
- better user experience

---

Compute Architecture Diagram

Client Layer
MathLive + CortexJS

↓

Application Layer
Next.js API

↓

Math Microservice
SymPy

↓

Data Layer
Supabase PostgreSQL

---

Summary

The Math Compute Pipeline ensures that algebra processing remains fast, scalable, and cost-efficient.

The architecture relies on:

CortexJS for browser-side symbolic math
SymPy for advanced server-side computation

This hybrid design allows interactive math learning while maintaining a lightweight backend infrastructure.

--
12. 
Billing Layer

The platform includes a billing system to support SaaS subscription plans.

Responsibilities:

- manage user subscription status
- track plan tiers
- handle payment events
- control feature access

Supported payment providers:

Mayar (Indonesia)

Billing architecture:

User
→ Subscription Plan
→ Payment Provider
→ Webhook Events
→ Database Update

Key features:

- free tier access
- premium subscription plans
- webhook-based payment confirmation
- subscription status validation in API routes
Billing & AI Feature Access

The platform follows a freemium model where basic learning features are free while advanced AI tutoring features require a premium subscription.

Free Tier

Free users can access:

- algebra practice problems
- PvP duel mode
- basic curriculum progression

AI usage is limited to one free AI hint per problem.

This allows students to try the AI tutor without excessive API cost.

---

Premium Tier

Premium users unlock full AI tutoring capabilities.

Features include:

- unlimited AI hints
- deeper step explanations
- mistake analysis
- AI-generated guidance for difficult problems
- personalized curriculum suggestions

Premium access is controlled by the subscription system.

---

AI Usage Control

AI access is enforced server-side.

Each AI request checks the user's subscription status.

Flow:

User Request Hint
→ API Route
→ Check Subscription Tier
→ Check AI Usage Limit
→ Allow or Reject Request

Free users:

- 1 hint per problem
- limited daily hints

Premium users:

- unlimited hints

---

Database Tracking

AI usage is tracked to enforce limits.

Example fields:

ai_hint_usage
user_id
problem_id
hint_count
created_at

This allows the system to enforce hint limits reliably.

---

Monetization Strategy

The freemium AI model allows:

- free users to experience the AI tutor
- conversion to premium for advanced assistance

This approach balances:

- educational accessibility
- infrastructure cost control
- SaaS revenue generation

13. AI Rate Limiting

AI tutor usage is limited per session to control API cost.

Rate limiting strategy:

- hints per problem are limited
- hints per session are tracked
- daily usage limits per user

Example policy:

Maximum hints per problem: 5
Maximum hints per session: configurable

Implementation:

The system tracks hint usage in the database and blocks additional requests when limits are reached.

This prevents abuse of the AI tutoring system and protects API quota usage.

--
14. Background Jobs

Some processes require asynchronous execution to avoid request timeouts.

Background jobs are used for:

- material text extraction
- topic extraction using AI
- concept graph generation
- bulk problem generation

Job processing pipeline:

User Upload
→ Job Queue
→ Processing Worker
→ Database Update

Possible implementations:

Supabase Edge Functions
Inngest
Scheduled jobs via pg_cron
--
15. Problem Pool Cache

To ensure fast matchmaking and avoid runtime problem generation delays, the system maintains a cached pool of generated problems.

The pool contains pre-generated problems categorized by:

- topic
- difficulty
- problem type

Workflow:

Problem Generator
→ Pre-generate problems
→ Store in problem pool
→ PvP duel selects from pool

Benefits:

- instant problem availability
- reduced compute load
- consistent difficulty in PvP matches



--
16. Deployment

Frontend + API

Vercel

Database

Supabase

Math microservice

Render

CI/CD

GitHub Actions.

---

12. Scaling Plan

Stage 1

Modular monolith architecture.

Stage 2

Extract math service.

Stage 3

Separate AI tutoring service.

Stage 4

Dedicated matchmaking service.

---

13. Summary

The platform combines:

symbolic math engine
AI tutoring
adaptive curriculum
realtime multiplayer.

Architecture optimized for rapid iteration with scalable components.


