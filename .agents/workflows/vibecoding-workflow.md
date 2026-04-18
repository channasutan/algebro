---
description:  This document defines how AI-assisted development should be performed in this repository.
---

Vibecoding Workflow

Overview

This document defines how AI-assisted development should be performed in this repository.

The goal is to ensure that AI-generated code:

- follows the documented architecture
- respects system boundaries
- does not introduce undocumented behavior
- remains consistent with existing modules

AI tools must treat project documentation as the source of truth.

---

Documentation First

Before writing any code, AI must read the documentation in "/docs".

Important documents include:

- roadmap.md
- architecture.md
- system-flow.md
- data-model.md
- api-contracts.md
- event-contracts.md
- ai-architecture.md
- security.md
- deployment.md
- testing-strategy.md
- observability.md

AI must understand the system before implementing features.

---

Source of Truth

When generating code, AI must prioritize the following order:

1. project documentation
2. API contracts
3. data model
4. architecture rules

AI must not invent new patterns that conflict with these documents.

---

Module Boundaries

AI must respect module boundaries defined in "architecture.md".

Examples:

- business logic belongs in service modules
- API routes should call services
- database access should follow the data model
- modules should not directly depend on unrelated modules

---

API Rules

All APIs must follow the definitions in "api-contracts.md".

AI must not:

- create undocumented endpoints
- change response formats
- introduce new request structures without updating the contracts

---

Database Rules

Database structures must follow "data-model.md".

AI must not:

- introduce new tables without migrations
- change schema definitions without documentation
- bypass row-level security rules

---

Security Rules

AI-generated code must follow "security.md".

Key rules:

- never expose secrets
- validate all external input
- respect authorization checks
- do not bypass RLS protections

---

Implementation Workflow

AI development should follow this order:

1. understand the roadmap
2. read relevant documentation
3. implement a small logical change
4. verify code consistency
5. commit the change

AI should avoid large multi-feature implementations in a single step.

---

Commit Guidelines

Each commit should represent one logical change.

Examples:

- creating a service module
- adding an API route
- implementing validation logic
- adding tests

Large commits should be avoided.

---

Feature Development

Feature implementation should follow the roadmap order.

Typical sequence:

1. core service logic
2. API route
3. validation logic
4. tests

Each step should be implemented in separate commits.

---

Code Quality Rules

AI-generated code should follow these guidelines:

- keep modules small and focused
- avoid unnecessary abstractions
- follow existing project patterns
- write readable code
- avoid duplicating logic

---

Testing

When adding new logic, AI should also add tests where appropriate.

Tests should verify:

- expected behavior
- validation rules
- error handling

Testing strategies are defined in "testing-strategy.md".

---

Summary

AI-assisted development must follow this process:

read documentation
↓
understand architecture
↓
implement small logical changes
↓
commit frequently
↓
respect system boundaries

Documentation always overrides assumptions made by the AI.
