# api-contracts.md

# API Contracts

## Overview

This document defines the public HTTP API used by the platform.

These APIs connect:

- Next.js frontend
- module services
- database layer

API routes must follow:

- development-rules.md
- modules.md
- system-flow.md

Important rules:

- Route handlers must remain thin
- Request validation happens at the API boundary
- Business logic lives inside module services
- Endpoints use resource-oriented naming
- Long-running operations use async workflows

---

# API Design Principles

Principles:

- REST-style resource endpoints
- JSON request/response
- strict schema validation
- typed responses
- consistent error format
- authentication before protected operations

Request flow:

Request  
↓  
Authenticate  
↓  
Validate schema  
↓  
Call module service  
↓  
Return typed response

---

# Base Path

Current API version:

/api/v1

Examples:

/api/v1/practice-sessions  
/api/v1/attempts/{attempt_id}/steps  
/api/v1/materials

---

# Authentication

Authentication provider:

Supabase Auth

Authenticated requests include:

Authorization: Bearer \<token>

User identity is resolved via:

supabase.auth.getUser()

Protected endpoints must reject unauthenticated requests.

---

# Response Conventions

## Success

Example:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

## Error

Example:

```json
{
  "error": {
    "code": "INVALID_STEP",
    "message": "The algebra transformation is invalid.",
    "details": null,
    "request_id": "req_123"
  }
}
```

---

# Status Code Conventions

| Code | Meaning |
|-----|------|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (async job) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

# Practice Sessions

## Create Practice Session

Endpoint:

POST /api/v1/practice-sessions

Request:

```json
{
  "topic_id": "uuid",
  "mode": "standard"
}
```

Response:

```json
{
  "data": {
    "session_id": "uuid",
    "attempt_id": "uuid",
    "problem": {
      "problem_id": "uuid",
      "latex": "2x + 3 = 11",
      "difficulty": 1
    }
  }
}
```

Status:

201 Created

Service:

PracticeEngine.startPracticeSession()

---

# Problem Recommendations

## Get Next Problem

Endpoint:

GET /api/v1/recommendations/next-problem

Query parameters:

topic_id  
mode  
difficulty

Response:

```json
{
  "data": {
    "problem_id": "uuid",
    "latex": "3x - 5 = 10",
    "problem_type": "algebra_equation",
    "difficulty": 2
  }
}
```

Service:

CurriculumEngine.getRecommendedProblem()

---

# Attempts

## Submit Step

Endpoint:

POST /api/v1/attempts/{attempt_id}/steps

Request:

```json
{
  "step_latex": "2x + 6"
}
```

Response:

```json
{
  "data": {
    "step_index": 3,
    "is_valid": true,
    "error_type": null
  }
}
```

Service:

PracticeEngine.submitStep()

---

## Complete Attempt

Endpoint:

POST /api/v1/attempts/{attempt_id}/completion

Response:

```json
{
  "data": {
    "attempt_id": "uuid",
    "completed": true,
    "result": "correct"
  }
}
```

Service:

PracticeEngine.completeAttempt()

---

# AI Hints

## Create Hint

Endpoint:

POST /api/v1/attempts/{attempt_id}/hints

Request:

```json
{
  "step_index": 3
}
```

Response:

```json
{
  "data": {
    "hint": "Try expanding the parentheses first.",
    "remaining_quota": 2
  }
}
```

Service:

AITutor.generateHint()

Guards:

BillingEngine.checkFeatureAccess()  
Rate limiter  
AI quota validation

Possible errors:

403 FEATURE_NOT_AVAILABLE  
429 AI_RATE_LIMITED

---

# Materials

## Upload Material

Endpoint:

POST /api/v1/materials

Content-Type:

multipart/form-data

Fields:

file  
title (optional)

Response:

```json
{
  "data": {
    "material_id": "uuid",
    "status": "uploaded",
    "job_id": "uuid"
  }
}
```

Status:

202 Accepted

Service:

MaterialProcessingEngine.uploadMaterial()

---

## Get Material Status

Endpoint:

GET /api/v1/materials/{material_id}

Response:

```json
{
  "data": {
    "material_id": "uuid",
    "status": "processing",
    "topics": []
  }
}
```

Service:

MaterialProcessingEngine.getMaterialStatus()

---

# PvP Duels (Post Launch)

## Join Matchmaking

Endpoint:

POST /api/v1/duel-queues

Request:

```json
{
  "topic_id": "uuid"
}
```

Response:

```json
{
  "data": {
    "status": "queued"
  }
}
```

Service:

PvPDuelEngine.joinMatchmaking()

---

## Submit Duel Answer

Endpoint:

POST /api/v1/duels/{duel_id}/answers

Request:

```json
{
  "answer_latex": "x = 4"
}
```

Response:

```json
{
  "data": {
    "correct": true
  }
}
```

Service:

PvPDuelEngine.submitAnswer()

---

# Subscriptions

## Get Current Subscription

Endpoint:

GET /api/v1/subscriptions/me

Response:

```json
{
  "data": {
    "plan": "free",
    "status": "active"
  }
}
```

Service:

BillingEngine.getUserPlan()

---

# Stripe Webhook

Endpoint:

POST /api/v1/webhooks/stripe

Requirements:

- verify Stripe signature
- process idempotently

Response:

```json
{
  "received": true
}
```

Service:

BillingEngine.handleWebhookEvent()

---

# Rate Limiting

Example limits:

| Endpoint | Limit |
|------|------|
| AI hints | 5/day free tier |
| material upload | 10/day |
| duel queue join | anti-spam |

Rate limited responses return:

429 Too Many Requests

---

# Idempotency Rules

The following operations must be idempotent:

- webhook processing
- payment state updates
- duel queue join
- background job scheduling

Mechanisms:

webhook_event_id  
idempotency_keys  
unique constraints

---

# Validation Rules

All request payloads must use schema validation.

Recommended:

Zod schemas  
shared TypeScript types

Invalid requests return:

422 Unprocessable Entity

---

# Observability

Each API request should log:

request_id  
user_id  
endpoint  
status_code  
latency

---

# Summary

The API layer is responsible for:

- authenticating requests
- validating input
- calling module services
- returning typed responses

Business logic remains inside module services.

Frontend  
↓  
API  
↓  
Modules  
↓  
Database  

This keeps the system:

- modular
- maintainable
- scalable
