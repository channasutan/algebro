# event-contracts.md

# Event Contracts

## Overview

This document defines the domain events used by the platform.

The system follows an **event-driven modular monolith architecture** where modules communicate through internal domain events.

Events are used to:

- decouple modules
- trigger cross-module side effects
- maintain system consistency
- support analytics and observability

Modules do not call each other's internal repositories directly.

Instead they communicate through:

- service calls (synchronous)
- domain events (asynchronous)

---

# Event Design Principles

Rules for all domain events:

1. Events represent **facts that already happened**.
2. Event names must use **past tense**.
3. Event payloads must be **immutable**.
4. Events must contain enough context for consumers.
5. Event payload schemas must remain backward compatible.

Example naming:

Correct:

```
attempt_completed
step_validated
material_processed
duel_finished
```

Incorrect:

```
complete_attempt
update_mastery
run_validation
```

---

# Event Infrastructure

Events are published through the internal event bus.

Implementation location:

```
events/event-bus.ts
events/event-types.ts
```

Publishing flow:

```
Module
↓
Event Bus
↓
Subscribed Handlers
↓
Module Reactions
```

Events are handled asynchronously when possible.

---

# Event Envelope

All events follow a standard envelope format.

Example:

```json
{
  "event_id": "uuid",
  "event_type": "attempt_completed",
  "timestamp": "2026-03-11T10:30:00Z",
  "payload": {}
}
```

Fields:

| Field | Description |
|------|------|
| event_id | unique identifier |
| event_type | event name |
| timestamp | event creation time |
| payload | event data |

---

# Core Domain Events

## step_submitted

Emitted when a student submits a new step during problem solving.

Emitter:

```
Practice Engine
```

Payload:

```json
{
  "attempt_id": "uuid",
  "step_index": 3,
  "step_latex": "2x + 6"
}
```

Consumers:

```
Step Validation Engine
```

---

## step_validated

Emitted after step validation completes.

Emitter:

```
Step Validation Engine
```

Payload:

```json
{
  "attempt_id": "uuid",
  "step_index": 3,
  "is_valid": true,
  "error_type": null
}
```

Consumers:

```
Practice Engine
AI Tutor
Analytics
```

---

## attempt_completed

Emitted when a problem attempt is successfully finished.

Emitter:

```
Practice Engine
```

Payload:

```json
{
  "attempt_id": "uuid",
  "user_id": "uuid",
  "problem_id": "uuid",
  "topic_id": "uuid",
  "completed_at": "timestamp"
}
```

Consumers:

```
Curriculum Engine
Gamification Engine
Analytics
```

Effects:

```
update mastery
grant XP
track completion metrics
```

---

## material_uploaded

Emitted when a user uploads learning material.

Emitter:

```
Material Processing Engine
```

Payload:

```json
{
  "material_id": "uuid",
  "user_id": "uuid",
  "file_name": "algebra_book.pdf"
}
```

Consumers:

```
Background Job System
```

Effect:

```
trigger material extraction job
```

---

## material_processed

Emitted after uploaded material has been processed.

Emitter:

```
Material Processing Engine
```

Payload:

```json
{
  "material_id": "uuid",
  "topics": [
    "linear equations",
    "systems of equations"
  ]
}
```

Consumers:

```
Curriculum Engine
```

Effect:

```
update personalized curriculum
```

---

## duel_started

Emitted when a PvP duel begins.

Emitter:

```
PvP Duel Engine
```

Payload:

```json
{
  "duel_id": "uuid",
  "player1_id": "uuid",
  "player2_id": "uuid",
  "topic_id": "uuid"
}
```

Consumers:

```
Realtime Engine
Analytics
```

---

## duel_finished

Emitted when a duel ends.

Emitter:

```
PvP Duel Engine
```

Payload:

```json
{
  "duel_id": "uuid",
  "winner_id": "uuid",
  "player1_id": "uuid",
  "player2_id": "uuid",
  "finished_at": "timestamp"
}
```

Consumers:

```
Gamification Engine
Analytics
```

Effects:

```
grant XP
update leaderboard
```

---

## subscription_updated

Emitted when a user's subscription changes.

Emitter:

```
Billing Engine
```

Payload:

```json
{
  "user_id": "uuid",
  "plan": "premium",
  "status": "active"
}
```

Consumers:

```
Feature Access Control
Analytics
```

---

# Event Processing Rules

Event handlers must follow these rules:

- handlers must be idempotent
- handlers must not mutate event payloads
- handlers must tolerate duplicate delivery
- handlers must log failures

Example idempotency strategies:

```
event_id deduplication
processed_events table
```

---

# Failure Handling

If event processing fails:

```
retry handler
log error
send alert
```

Retries should use exponential backoff.

---

# Observability

Each event must be logged with:

```
event_type
event_id
timestamp
handler_status
latency
```

This enables:

- debugging
- analytics
- system monitoring

---

# Event Versioning

Event schemas must remain backward compatible.

When schema changes:

```
add new fields
never remove existing fields
```

Example:

```
step_validated_v2
```

---

# Summary

Domain events allow modules to remain loosely coupled.

Event flow:

```
Module Action
↓
Emit Domain Event
↓
Event Bus
↓
Other Modules React
```

Core event categories:

```
learning events
content events
gameplay events
billing events
```

This event system enables:

- modular architecture
- scalable feature development
- reliable cross-module communication
