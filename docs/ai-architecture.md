# ai-architecture.md

# AI Architecture

## Overview

This document defines the architecture and operational rules for AI features used in the platform.

AI enhances the learning experience but is **not responsible for mathematical correctness**.

Core correctness is enforced by deterministic validation systems.

AI responsibilities include:

- generating contextual hints
- explaining concepts
- assisting complex step interpretation
- generating practice problems
- extracting topics from uploaded materials

AI must always operate within controlled system constraints.

---

# Core Design Principle

The platform follows a deterministic-first approach.

Validation hierarchy:

Student step  
↓  
Symbolic validation engine  
↓  
Rule-based transformation validation  
↓  
AI fallback assistance  
↓  
Final result returned

AI is used only when deterministic validation cannot interpret the step.

AI must never become the primary authority for mathematical correctness.

---

# AI System Roles

## Hint Generation

AI generates contextual hints during practice sessions.

Goals:

- guide student reasoning
- avoid revealing the full solution
- explain relevant mathematical concepts

Constraints:

- hints must not reveal the final answer
- hints must not complete the entire solution
- hints must reference the current step context

Example hint types:

- conceptual hints
- next-step guidance
- explanation of mistakes

---

## Step Interpretation Assistance

The primary step validator uses symbolic math.

AI assists when a student step is difficult to interpret using symbolic methods.

Example cases:

- unusual algebraic rewrites
- natural-language reasoning
- ambiguous transformations

Rules:

- AI suggestions are advisory
- deterministic validation remains authoritative
- AI must not override confirmed symbolic results

---

## Problem Generation

AI may generate practice problems based on:

- curriculum topics
- uploaded materials
- selected difficulty level

Generated problems must satisfy:

- clear mathematical structure
- solvable step-by-step
- compatibility with the validation engine

Generated problems may be cached to reduce repeated AI calls.

---

## Material Processing

AI may assist with processing uploaded materials.

Tasks include:

- extracting mathematical topics
- identifying problem structures
- generating practice questions

Deterministic parsers handle structural extraction where possible.

AI provides semantic interpretation.

---

# Model Usage

AI capabilities are provided through external model APIs.

Model selection criteria:

- reasoning ability
- reliability
- response latency
- cost efficiency

The system may support multiple providers to allow fallback if a provider fails.

AI providers must be treated as external dependencies.

---

# Prompt Design

Prompts follow a structured format.

Typical prompt structure:

System instruction  
↓  
Problem context  
↓  
Student step context  
↓  
Instruction for the model response  

Prompt rules:

- minimize token usage
- include only necessary context
- avoid sending sensitive internal data
- constrain expected output format when possible

Prompts must remain deterministic in intent even if model responses vary.

---

# Prompt Safety

Prompt injection is a known risk.

Protection strategies include:

- strict separation between system prompts and user input
- sanitization of user-provided text
- limiting model context to required data

AI must never reveal:

- system prompts
- internal system instructions
- platform policies
- hidden evaluation logic

---

# Output Safety

AI output must be treated as untrusted data.

Rules:

- AI responses must be validated before use
- rendered AI content must be sanitized
- AI output must not affect authorization logic
- AI output must not affect billing logic

Mathematical outputs from AI must pass validation before being accepted.

---

# Cost Control

AI usage must be controlled to manage operational costs.

Strategies include:

- caching repeated AI responses
- limiting prompt size
- daily usage quotas
- restricting AI features in free plans

Example quotas:

- hints per day
- AI-assisted validations per session
- material processing per upload

AI calls should only occur when deterministic methods cannot handle the task.

---

# Latency Strategy

AI calls introduce additional latency.

Mitigation strategies:

- deterministic engines execute first
- AI fallback triggered only when needed
- asynchronous processing where possible
- caching of previously generated responses

User experience must remain responsive even if AI services are slow.

---

# AI Fallback Strategy

AI services may fail or become unavailable.

Fallback options include:

- retry with exponential backoff
- switch to secondary AI provider
- return simplified hint
- disable AI temporarily while keeping core functionality operational

Core learning flows must function without AI.

---

# AI Abuse Protection

AI endpoints must be protected against abuse.

Protection mechanisms:

- per-user quotas
- API rate limiting
- anomaly detection
- subscription-tier limits

Examples of abuse:

- automated hint spamming
- prompt manipulation attempts
- scraping AI-generated responses

Monitoring systems should detect unusual usage patterns.

---

# Observability

AI behavior must be monitored in production.

Important metrics include:

- AI request latency
- provider error rates
- token consumption
- request frequency
- fallback activation frequency

Monitoring tools:

- Sentry
- New Relic

These metrics help detect:

- provider instability
- abnormal usage
- cost anomalies

---

# Future Improvements

Potential AI improvements include:

- stronger mathematical reasoning models
- personalized tutoring strategies
- adaptive problem difficulty
- improved semantic parsing of materials

All future AI features must follow the same safety and reliability principles.

---

# Summary

AI enhances the platform while deterministic systems ensure correctness.

Core principles:

- deterministic validation first
- AI used only as assistance
- strict prompt and output safety
- cost and latency control
- abuse protection and observability

This architecture ensures AI remains a helpful component without becoming a critical system dependency.
