# Backend Architecture

## Overview

The backend follows a modular monolith architecture.

All domain logic, business rules, and infrastructure integrations live in backend modules.

The backend is responsible for:

- executing business logic
- managing data persistence
- coordinating external services
- processing events
- running background jobs

The backend acts as the central authority of the system.

---

# Core Principles

### Modular Monolith

The system is structured as independent modules within a single application.

Each module owns its:

- domain logic
- data models
- internal workflows

Modules communicate through:

- events
- service interfaces

---

### Clear Separation of Concerns

The backend separates responsibilities into layers:

Application Layer ↓ Modules ↓ Repositories ↓ Infrastructure Adapters ↓ External Services

Each layer has strict responsibilities.

---

### Backend as Source of Truth

All domain rules must live in backend modules.

Frontend must not implement domain logic.

---

# Backend Layers

## Application Layer

The application layer handles:

- API routes
- server actions
- request validation
- authentication

Responsibilities:

- receive requests from frontend
- call backend modules
- return responses

---

## Modules

Modules contain the core business logic.

Each module encapsulates a specific domain.

Examples:

payments materials users duels

Module responsibilities:

- domain logic
- validation
- internal workflows
- event emission

Modules must not import infrastructure adapters directly.
Modules must not import `lib/supabase/*` directly.

Instead they rely on repository files inside the same module.

---

## Repositories

Repositories are the persistence and integration boundary owned by a module.

Repository responsibilities:

- database access
- infrastructure adapter orchestration
- Supabase client usage when required

Repositories are the only module files allowed to:

- import infrastructure adapters
- import `lib/supabase/*`
- translate persistence or adapter responses into module-friendly data

Application layers, services, domain files, and events must not create or import Supabase clients directly.

---

## Event System

The backend uses an internal event system.

Events allow modules to communicate without tight coupling.

Example flow:

PaymentCompletedEvent ↓ MaterialProcessingJob ↓ MaterialGeneratedEvent

Events are used for:

- cross-module communication
- async workflows
- system extensibility

---

## Job Runner

Background tasks are executed by the job runner.

Responsibilities:

- execute asynchronous tasks
- process queued jobs
- retry recoverable failures

Example jobs:

material-processing ai-evaluation notification delivery

Jobs allow heavy operations to run outside the request cycle.

---

# Infrastructure Adapters

Infrastructure adapters isolate external dependencies.

Adapters are responsible for:

- API communication
- request formatting
- error normalization

Examples:

Gemini Adapter SymPy Adapter Mayar Adapter Supabase Adapter Realtime Adapter

Infrastructure adapters are accessed through repositories, never directly from application layers or non-repository module files.

---

# External Services

External services are accessed only through adapters.

Examples:

### AI Services

Handled through the Gemini adapter.

Used for:

- AI responses
- analysis
- evaluation

---

### Math Compute

Hybrid compute model:

Client side:

CortexJS

Server side:

SymPy microservice

SymPy is accessed through the SymPy adapter.

---

### Payments

Payments are handled through the Mayar adapter.

Responsibilities:

- checkout session creation
- payment verification
- webhook handling

---

### Database

Persistence is handled through Supabase.

Supabase provides:

- PostgreSQL database
- authentication
- realtime infrastructure

---

# Environment Configuration

Environment variables are managed through the config layer.

Examples:

env.server.ts env.public.ts

Rules:
- required variables must be validated
- environment access should be centralized
- infrastructure modules should not read raw environment variables unless necessary

---

# Error Handling

Errors are categorized into:

### Domain Errors

Validation failures or business rule violations.

Handled inside modules.

---

### Infrastructure Errors

External service failures.

Handled inside adapters.

---

### System Errors

Unexpected failures.

Handled by application layer error boundaries.

---

# Summary

The backend architecture is built around:

- modular monolith structure
- strict layer boundaries
- repository-mediated access to infrastructure
- event-driven workflows
- infrastructure adapters

This design ensures:

- maintainability
- scalability
- clear separation of responsibilities


---
