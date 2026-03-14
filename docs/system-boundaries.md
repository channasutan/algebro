# System Boundaries

## Overview

This document defines the architectural boundaries of the system.

The goal is to enforce clear separation between:

- frontend
- backend modules
- infrastructure adapters
- external services

Strict boundaries prevent architectural drift and maintain the modular monolith design.

---

# System Layers

The system is organized into the following layers:

Frontend ↓ Application Layer ↓ Modules ↓ Infrastructure Adapters ↓ External Services

Each layer has specific responsibilities and allowed interactions.

---

# Frontend Boundary

The frontend is responsible only for the presentation layer.

Allowed responsibilities:

- rendering UI
- handling user interaction
- calling backend endpoints
- subscribing to realtime updates

The frontend must never access infrastructure or external services directly.

Allowed interaction:

Frontend → Backend API / Server Action

Forbidden interactions:

Frontend → Database Frontend → External APIs Frontend → Infrastructure Adapters Frontend → Payment Providers Frontend → AI Services

All system logic must pass through the backend.

---

# Backend Application Boundary

The application layer acts as the entry point for backend logic.

Responsibilities:

- receive frontend requests
- perform authentication
- validate request structure
- call backend modules

Allowed interactions:

Application Layer → Modules

The application layer should not contain business logic.

---

# Module Boundary

Modules contain core domain logic.

Each module owns:

- business rules
- domain workflows
- internal data handling

Modules may:

- call other modules through events
- use infrastructure adapters

Allowed interactions:

Module → Adapter Module → Event System

Forbidden interactions:

Module → External API directly Module → Database driver directly Module → Payment provider directly

All external communication must go through adapters.

---

# Infrastructure Adapter Boundary

Infrastructure adapters isolate external dependencies.

Responsibilities:

- external API communication
- request formatting
- response normalization
- error translation

Examples of adapters:

Gemini Adapter SymPy Adapter Mayar Adapter Supabase Adapter Realtime Adapter

Allowed interactions:

Adapter → External Service Adapter → Module (returning results)

Adapters must not implement domain logic.

---

# External Service Boundary

External services are outside the system.

Examples:

- AI services
- payment providers
- compute services
- database infrastructure

External services are accessed only through adapters.

Example flow:

Module ↓ Adapter ↓ External Service

This ensures that external APIs do not leak into domain logic.

---

# Realtime Boundary

Realtime updates use Supabase Realtime.

Rules:

- frontend subscribes to channels
- backend controls channel lifecycle
- realtime events originate from backend workflows

Allowed flow:

Backend Event ↓ Realtime Adapter ↓ Supabase Realtime ↓ Frontend Subscription

Frontend must not manage realtime infrastructure.

---

# Math Compute Boundary

Mathematical computation uses a hybrid model.

Client side:

CortexJS

Used for:

- symbolic parsing
- math input formatting

Server side:

SymPy microservice

Used for:

- heavy computation
- symbolic evaluation
- deterministic verification

The frontend must not call the SymPy service directly.

Correct flow:

Frontend ↓ Backend Module ↓ SymPy Adapter ↓ SymPy Service

---

# Payment Boundary

Payments are handled through the Mayar adapter.

Correct flow:

Frontend ↓ Backend Module ↓ Mayar Adapter ↓ Mayar API

The frontend must not call payment providers directly.

---

# Database Boundary

The database is managed through Supabase.

Rules:
- database access occurs only inside backend modules
- frontend must not query database tables directly
- infrastructure adapters may assist database access

Forbidden flow:

Frontend → Supabase Database

---

# Allowed Interaction Summary

Frontend → Backend Backend → Modules Modules → Adapters Adapters → External Services

---

# Forbidden Interaction Summary

Frontend → Database Frontend → External APIs Frontend → Adapters Modules → External APIs directly Adapters → Domain Logic

---

# Architectural Enforcement

Developers must follow these rules when adding new features:

- do not bypass system layers
- do not embed business logic in UI
- do not connect modules directly to external APIs
- always introduce adapters for external integrations

Violating these boundaries will degrade the system architecture.

---

# Summary

System boundaries ensure that responsibilities remain clearly separated.

The architecture enforces:

- modular backend design
- thin frontend
- adapter-based infrastructure integration

These boundaries allow the system to remain scalable, maintainable, and predictable.
