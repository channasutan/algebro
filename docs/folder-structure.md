folder-structure.md

Overview

This document defines the canonical project folder structure.

The architecture follows a modular monolith pattern.

Key principles:

- HTTP layer stays thin
- Business logic lives inside modules
- Modules own their data access
- External systems are isolated in infrastructure
- Cross-module communication occurs through service interfaces or events

---

Top-Level Structure

app/
modules/
  bootstrap.ts
  authentication/
  user-profiles/
lib/
infrastructure/
events/
jobs/
config/
types/
tests/
docs/

Folder| Purpose
app| Next.js App Router entry points and API routes
modules| Business domains and application logic
lib| Shared stateless utilities
infrastructure| External service clients
events| Domain event bus and event types
jobs| Background job processing
config| Environment configuration
types| Shared TypeScript types
tests| Integration and E2E tests
docs| Architecture and development documentation

---

app/

The "app/" directory contains Next.js routes.

Rules:

- No business logic
- Only HTTP handling
- Calls module services

Example:

app/
  api/
    v1/
      practice-sessions/
        route.ts
      attempts/
        [attempt_id]/
          steps/
            route.ts
      webhooks/
        mayar/
          route.ts

Responsibilities:

- request validation
- authentication
- calling services
- returning responses

---

modules/

Each domain is implemented as a module.

Modules encapsulate:

- business rules
- data access
- domain events

Example modules:

modules/
  authentication/
  user-profiles/
  practice/
  step-validation/
  ai-tutor/
  curriculum/
  problem-generator/
  material-processing/
  gamification/
  pvp-duel/
  billing/

---

Module Internal Structure

Each module follows the same internal structure.

modules/<module>/

  index.ts
  contracts/
  domain/
  services/
  repositories/
  events/
  tests/

Shared module bootstrap:

modules/
  bootstrap.ts

Directory| Purpose
index.ts| Public module interface
contracts| Input/output types
domain| Pure business rules
services| Application orchestration
repositories| Database access
events| Domain event handlers
tests| Module unit tests
bootstrap.ts| Server-side one-time registration for shared handlers and module wiring

Contracts should be split by use case when a module grows, for example:

- `contracts/sign-up.ts`
- `contracts/sign-in.ts`
- `contracts/session.ts`
- `contracts/get-profile.ts`
- `contracts/update-profile.ts`

---

lib/

Shared stateless helpers.

lib/
  auth/
  math/
  observability/
  rate-limit/
  supabase/

Examples:

- authentication helpers
- math utilities
- telemetry / logging
- rate limiting
- Supabase client initialization

Rules:

- no business logic
- no module ownership

---

infrastructure/

Adapters for external systems.

infrastructure/
  ai/
    gemini-client.ts
  math/
    sympy-client.ts
  payments/
    mayar-client.ts
  realtime/
    supabase-realtime.ts

Rules:

- isolate external dependencies
- no domain logic

---

events/

Domain event system.

events/
  event-bus.ts
  event-types.ts

Used for:

- gamification updates
- curriculum updates
- analytics
- async workflows

---

jobs/

Background job system.

jobs/
  job-runner.ts
  handlers/

Examples:

- material processing
- AI topic extraction
- analytics pipelines

---

config/

Environment configuration.

config/
  env.ts

Responsibilities:

- environment validation
- configuration loading

---

types/

Shared types across modules.

types/
  api.ts
  domain.ts
  events.ts

Rules:

- avoid module coupling
- used only for shared contracts

---

tests/

Global test infrastructure.

tests/
  integration/
  e2e/
  fixtures/

Unit tests stay inside modules.

---

Design Rules

1. Modules must not access other module repositories directly.
2. Cross-module communication occurs through services or events.
3. Infrastructure is the only place where external APIs are called.
4. HTTP layer remains thin.
5. Modules must expose a public interface through "index.ts".

---

Example Flow

Example practice submission flow:

HTTP Request
↓
app/api/v1/attempts/[id]/steps/route.ts
↓
Practice module service
↓
Step Validation module
↓
Repository update
↓
Domain event emitted
↓
Gamification / Curriculum modules react

---

Summary

This folder structure ensures:

- strong module boundaries
- maintainable business logic
- isolated infrastructure dependencies
- scalable modular architecture
