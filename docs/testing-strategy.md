testing-strategy.md

Testing Strategy

Overview

This document defines the testing strategy used to ensure the platform remains reliable, stable, and safe to deploy.

The strategy focuses on:

- preventing regressions
- validating business logic
- ensuring API correctness
- verifying user flows
- protecting against security vulnerabilities
- maintaining healthy test coverage

Testing follows a layered approach:

Unit Tests
↓
Component Tests
↓
Integration Tests
↓
End-to-End Tests

Additional layers include:

- AI-assisted QA testing
- coverage monitoring
- CI-based automated test execution

---

Testing Principles

The platform follows these principles:

- automated tests are preferred over manual testing
- tests must run in CI before deployment
- critical business logic must always have tests
- tests must be deterministic and reproducible
- external services must be mocked where possible
- regression bugs must always include a new test
- flaky tests must be fixed or quarantined immediately

---

Testing Pyramid

Unit Tests

Unit tests verify isolated logic.

Examples:

- algebra expression transformations
- step validation logic
- problem generation templates
- curriculum progression rules
- gamification XP calculations

Unit tests should not require:

- database access
- network calls
- external APIs

Recommended tool:

- Vitest

Test location:

/tests/unit

---

Component Tests

Component tests verify UI components in isolation.

Examples:

- Practice step input component
- Algebra editor
- Hint modal
- Problem rendering components

Recommended tools:

- Vitest
- React Testing Library

Goals:

- verify component logic
- verify UI state transitions
- avoid unnecessary E2E tests

Test location:

/tests/components

---

Integration Tests

Integration tests verify interactions between system components.

Examples:

- API routes interacting with services
- database reads and writes
- authentication flows
- Supabase RLS policy enforcement
- material processing pipelines

Integration tests may include:

- test database
- Supabase local instance
- mocked AI providers

Test location:

/tests/integration

---

End-to-End Tests

End-to-End (E2E) tests simulate real user behavior.

Examples:

- user signup and login
- starting a practice session
- solving algebra problems step-by-step
- requesting AI hints
- uploading learning materials
- PvP duel interactions

Recommended tool:

- Playwright

Test location:

/tests/e2e

---

E2E Test Strategy

Two categories of E2E tests exist.

Smoke Tests

Fast E2E tests run on every pull request.

Examples:

- login flow
- start practice session
- submit algebra step
- logout

These tests verify the core application path.

---

Full E2E Suite

The full E2E suite runs:

- nightly
- before major releases
- in staging environments

Full tests include:

- full curriculum flows
- AI hint usage
- material upload
- PvP duel interactions

---

AI-Assisted Testing

AI-assisted testing tools can discover UI and API issues automatically.

Example tool:

- TestSprite

Use cases:

- exploratory UI testing
- regression detection
- edge-case discovery
- unusual interaction flows

AI-assisted tests complement but do not replace deterministic automated tests.

---

Test Coverage

Test coverage measures how much code is exercised by tests.

Coverage goals:

- critical business logic: 90%+
- service layer: 80%+
- API routes: 80%+

Coverage reports are generated automatically in CI.

Tool example:

- Codecov

Coverage rules:

- new features must include tests
- coverage should not decrease without justification

---

Continuous Integration Testing

All tests run automatically in CI.

Example CI pipeline:

GitHub Actions
↓
Install dependencies
↓
Run linting
↓
Run unit tests
↓
Run component tests
↓
Run integration tests
↓
Run E2E smoke tests
↓
Generate coverage report
↓
Upload coverage to Codecov

Tests must pass before code can be merged.

CI may parallelize tests to reduce runtime.

---

Mocking Strategy

External dependencies must be mocked during tests.

Examples:

- AI provider APIs
- payment gateway APIs
- email services
- third-party HTTP services

Mocking ensures:

- deterministic tests
- faster test execution
- reduced external dependency failures

---

Database Testing

Database tests must run in an isolated environment.

Options include:

- Supabase local instance
- dedicated test database schema
- transaction rollback per test

Rules:

- tests must never modify production data
- database state must reset between tests

---

AI Feature Testing

AI features must be tested carefully due to non-deterministic outputs.

Testing strategy:

- validate prompt construction
- validate response structure
- enforce safety rules
- mock AI provider responses

AI tests should verify:

- hints are generated
- full solutions are not revealed
- invalid prompts are rejected

---

Security Testing

Security-related behaviors must be tested.

Examples:

- unauthorized API access
- RLS enforcement
- file upload validation
- webhook signature verification
- rate limiting enforcement

Security tests help prevent:

- privilege escalation
- data leaks
- abuse vulnerabilities

---

Performance Testing

Critical flows should periodically be tested for performance.

Examples:

- step validation latency
- problem generation speed
- AI response latency
- database query performance

Performance testing may use:

- synthetic workloads
- load testing tools

---

Regression Testing

Regression tests ensure previously fixed bugs do not reappear.

Rules:

- every bug fix must include a regression test
- regression tests must reproduce the original issue

---

Test Data

Test environments must use controlled test data.

Examples:

- predefined algebra problems
- mock users
- simulated learning materials

Test data must never include:

- real user data
- production secrets

---

Test Environment

Testing environments include:

Local development:

- local Next.js server
- optional Supabase local environment

CI environment:

- ephemeral test database
- isolated configuration

Staging environment:

- near-production environment
- used for manual QA and release validation

---

Local Development Performance

To reduce resource usage on developer machines:

- run E2E tests locally with Chromium only
- run full multi-browser tests in CI
- run Supabase locally only when needed
- prefer mocked external services during development

This keeps development workflows lightweight on laptops such as MacBook 2019.

---

Summary

The platform ensures reliability through layered testing:

- unit tests for isolated logic
- component tests for UI behavior
- integration tests for service interactions
- E2E tests for real user flows
- AI-assisted testing for exploratory validation

Supporting tools include:

- Vitest
- React Testing Library
- Playwright
- TestSprite
- Codecov
- GitHub Actions

This testing strategy ensures the platform remains stable, maintainable, and safe to deploy.
