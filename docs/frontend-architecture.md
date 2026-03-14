# Frontend Architecture

## Overview

The frontend is built using Next.js (App Router) and is responsible only for the presentation layer of the system.

The frontend must remain thin.

All domain logic, business rules, persistence, and external service integrations belong to the backend modules.

The frontend communicates with the backend through API routes or server actions.

---

# Goals

The frontend exists to:

- render UI
- handle user interaction
- request backend operations
- display results
- subscribe to realtime updates

The frontend is not responsible for business logic.

---

# Core Principles

The frontend follows these architectural principles:

### Thin UI Layer

The frontend should only contain UI and interaction logic.

Business rules must live in backend modules.

---

### Backend as Source of Truth

All authoritative data and domain behavior come from the backend.

The frontend should never implement logic that could diverge from backend behavior.

---

### Strict Layer Separation

Frontend must never directly access:

- database
- infrastructure adapters
- external services

All integrations must pass through the backend.

---

# Technology Stack

Framework:

- Next.js (App Router)

UI:

- React

State Management:

- TanStack Query (server state)
- React state (UI state)

Realtime:

- Supabase Realtime (via backend adapter)

Math input:

- CortexJS (client-side symbolic parsing)

Server compute:

- SymPy microservice

---

# Component Types

Next.js uses two component types.

## Server Components

Server Components are the default.

Used for:

- rendering pages
- fetching server data
- composing layouts

Example:

`tsx
export default async function Page() {
  const data = await fetch(...)
  return <Dashboard data={data} />
}

Server Components should be preferred whenever possible.


---

Client Components

Client Components are used when browser interaction is required.

Example:

"use client"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}

Client Components should be minimized to reduce bundle size.


---

State Management

The frontend handles two types of state.

UI State

Managed locally using React state.

Examples:

form inputs

modals

UI toggles

loading indicators



---

Server State

Managed using TanStack Query.

Examples:

fetched data

backend responses

mutation results


The backend remains the source of truth.


---

Data Flow

All application operations must pass through backend modules.

Correct flow:

User Interaction
↓
Frontend UI
↓
API Route / Server Action
↓
Backend Module
↓
Infrastructure Adapter
↓
External Service

Incorrect flows:

Frontend → Database
Frontend → AI provider
Frontend → Payment API
Frontend → Infrastructure adapter

Frontend must never bypass backend modules.


---

Realtime Updates

Realtime events are delivered using Supabase Realtime.

Frontend responsibilities:

subscribe to channels

update UI when events arrive


Channel lifecycle management is handled by the backend realtime adapter.

Frontend should not manage connection logic.


---

Folder Responsibilities

Typical frontend structure:

app/
components/
hooks/
lib/
styles/

app/

Next.js route segments and layouts.

Responsibilities:

page rendering

route structure

layout composition



---

components/

Reusable UI components.

Responsibilities:

visual presentation

user interaction


Components must not contain domain logic.


---

hooks/

Custom React hooks.

Used for:

UI state management

data fetching

subscriptions


Hooks should not implement business rules.


---

lib/

Frontend utility functions.

Examples:

formatting utilities

API helpers

UI helpers


Infrastructure adapters must not be imported here.


---

Forbidden Patterns

The frontend must NOT:

Access the database directly
supabase.from("users").select()

Call AI services directly

geminiClient.generate(...)

Call payment services directly

mayarClient.createCheckoutSession(...)

Import infrastructure adapters

import { sympyClient } from "@/infrastructure/math"

All integrations must go through backend modules.


---

Error Handling

Frontend handles:

network errors

loading states

user feedback


Backend handles:

domain validation

infrastructure failures

external service errors



---

Performance Guidelines

Prefer:

Server Components

streaming responses

caching

suspense boundaries


Avoid:

unnecessary client components

large client bundles

duplicating backend logic



---

Summary

The frontend is a thin UI layer responsible for rendering and interaction.

It must not implement domain logic or infrastructure access.

All operations must flow through backend modules to ensure consistent and maintainable architecture.
