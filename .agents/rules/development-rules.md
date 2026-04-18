---
trigger: always_on
---

Development Rules

Overview

This document defines development rules to maintain the architecture described in:

- architecture.md
- database.md
- modules.md
- folder-structure.md

These rules ensure the codebase remains modular, maintainable, and scalable.

---

Architecture Principles

The system follows a modular monolith architecture.

Core principles:

- domain modules own their data and logic
- modules communicate via service interfaces or domain events
- infrastructure integrations are isolated
- routing layers remain thin
- module boundaries must be strictly enforced

---

Module Boundary Rules

Modules must respect strict boundaries.

Rules:

1. A module may not access repositories of another module.

2. A module may only import from another module’s public entry point.

Correct:

import { startPracticeSession } from "@/modules/practice"

Incorrect:

import { practiceRepository } from "@/modules/practice/repository"

3. Database writes must only happen inside the owning module.

---

API Layer Rules

The API layer must remain thin.

Responsibilities:

- authentication
- request validation
- calling module services

Business logic must never live inside API routes.

Incorrect:

if (score > 10) updateMastery()

Correct:

await practiceService.completeAttempt()

---

Server Action Rules

Server actions must follow the same rules as API routes.

Responsibilities:

- authentication
- request validation
- calling module services

Server actions must not contain business logic.

---

Request Validation Rules

All external inputs must be validated at the API boundary.

Validation must happen before calling services.

Example flow:

request
↓
validate schema
↓
call module service

Recommended approach:

- schema validation (e.g. Zod)
- shared request/response types

---

Service Layer Rules

Services orchestrate domain operations.

Responsibilities:

- coordinate repositories
- call other module services
- emit domain events

Services must not contain infrastructure code.

Incorrect:

await fetch("https://api.gemini.ai")

Correct:

await geminiClient.generateHint()

Infrastructure calls must go through "/infrastructure".

---

Environment Rules

Environment variables must be read only inside `config/env.*`.

Rules:

- app routes, server actions, and modules must not read `process.env` directly outside the config layer
- auth-specific configuration used by first-party flows must be accessed through `config/env.*`
- auth-specific URLs such as site and callback URLs must be validated in `config/env.*` before use

Correct:

import { getAuthEnv } from "@/config/env.server-entry"

Incorrect:

const callbackUrl = process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL

---

Supabase Client Rules

Supabase client lifecycle must stay explicit and request-safe.

Rules:

- Supabase server clients must be created per request
- never create a singleton Supabase server client in module scope
- only repositories may import `lib/supabase/*`
- infrastructure code must receive Supabase clients through dependency injection instead of importing them directly
- services must receive Supabase clients through dependency injection instead of importing them directly
- application layers must not directly create Supabase clients
- use `getSupabaseServerClient()` instead of manually constructing a Supabase server client

Usage:

```ts
import { getSupabaseServerClient } from "@/lib/supabase/server-client"

export async function example() {
  const supabase = await getSupabaseServerClient()
}
```

This helper must be used instead of constructing Supabase clients manually.

---

Public Service Contract Rules

Every public service must expose typed input and output contracts.

Example:

SubmitStepInput
SubmitStepResult

Contracts ensure stable APIs between modules and prevent leaking internal types.

---

Repository Rules

Repositories handle database access.

Rules:

- repositories may only access tables owned by the module
- repositories are the only module layer allowed to import `lib/supabase/*`
- repositories must not contain business logic
- repository functions must be deterministic

Correct:

await practiceRepository.insertAttempt()

Incorrect:

if (userLevel > 5) {
  insertAttempt()
}

Business rules belong in the domain layer.

---

Domain Layer Rules

Domain files contain pure business rules and invariants.

Examples:

validateAttemptState()
ensureSequentialSteps()
calculateMasteryScore()

Rules:

- no database access
- no external API calls
- pure deterministic logic

---

Event Rules

Domain events enable loose coupling between modules.

Rules:

1. Events must represent past tense domain facts.

Examples:

attempt_completed
duel_finished
material_processed

2. Events must use domain language, not technical names.

Bad example:

update_item

Good example:

attempt_completed

3. Event payloads must follow defined contracts.

Example:

{
  user_id,
  topic_id,
  attempt_id,
  completed_at
}

4. Event handlers must live inside modules, not in global folders.

---

Service vs Event Usage

Use service calls when:

- immediate response is required
- the caller depends on the result

Use domain events when:

- triggering side effects
- notifying other modules
- updating analytics or gamification

Example:

Practice Engine
↓
emit attempt_completed
↓
Curriculum Engine updates mastery
↓
Gamification Engine grants XP

---

Infrastructure Rules

External systems must live inside "/infrastructure".

Examples:

infrastructure/ai/gemini-client.ts
infrastructure/sympy/sympy-client.ts
infrastructure/payments/stripe-client.ts

Modules must never call external APIs directly.

---

Shared Library Rules

Shared utilities live inside "/lib".

Rules:

- must be stateless
- must not contain domain logic
- must not depend on module repositories

Examples:

lib/math/latex-utils.ts
lib/auth/jwt.ts
lib/rate-limit.ts

---

Event Bus Rules

The global event system lives in "/events".

Responsibilities:

- event definitions
- event bus

Important rule:

Event handlers remain inside modules.

---

Background Job Rules

Background processing lives inside "/jobs".

Jobs are used for:

- long-running operations
- AI processing
- heavy computation
- bulk problem generation
- material extraction

Workers must use the database job queue pattern:

SELECT jobs
FOR UPDATE SKIP LOCKED

Rules:

- jobs must be idempotent
- jobs must support retries
- jobs must be resumable

---

Import Rules

Imports must respect module boundaries.

Allowed:

modules/practice
modules/duel
modules/curriculum

Not allowed:

modules/practice/repository
modules/practice/domain

---

Testing Rules

Each module must contain its own tests.

Location:

modules/<module>/tests

Types of tests:

- domain unit tests
- service tests
- repository integration tests

Tests must verify domain invariants and business rules.

---

Architecture Enforcement

Architectural rules must be enforced by tooling.

Recommended enforcement:

- lint rules for import boundaries
- architecture checks in CI
- automated tests verifying module isolation

Documentation alone is not sufficient.

---

Code Style Guidelines

General guidelines:

- keep functions small and composable
- avoid large service files
- prefer pure functions in domain logic
- prefer explicit types

---

AI Coding Rules

When generating code with AI tools:

1. Never place business logic in "app/".
2. Always implement logic inside modules.
3. Follow module boundaries.
4. Do not bypass repositories.
5. Emit domain events for cross-module effects.

---

Summary

These development rules enforce the architecture defined in the documentation.

Goals:

- maintain strong module boundaries
- prevent architectural drift
- keep the monolith modular
- ensure long-term maintainability
