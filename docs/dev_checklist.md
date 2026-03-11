# Development Checklist

## Overview

This checklist helps ensure that every code change follows the project architecture, security rules, and development standards.

Developers and AI tools should review this checklist before committing or opening a pull request.

---

## Architecture

Before committing code, verify:

- the change follows "architecture.md"
- module boundaries are respected
- business logic remains inside service modules
- API routes do not contain heavy business logic
- no unnecessary coupling between modules

---

## API

Verify that:

- new APIs follow "api-contracts.md"
- request and response formats match the contract
- no undocumented endpoints are introduced
- error responses follow the existing pattern

---

## Data Model

Check that:

- database changes follow "data-model.md"
- migrations are included if schema changes occur
- no direct schema modifications are made without migration
- queries follow recommended patterns

---

## Security

Verify that:

- secrets are never exposed
- environment variables are not logged
- external inputs are validated
- authorization rules are respected
- Row Level Security (RLS) rules are not bypassed

Security guidelines are defined in "security.md".

---

## Testing

Confirm that:

- tests exist for new logic when appropriate
- existing tests still pass
- no tests depend on production data
- test environments remain isolated

Testing strategy is defined in "testing-strategy.md".

---

## Code Quality

Check that:

- code follows existing project patterns
- modules remain small and focused
- duplicated logic is avoided
- unnecessary abstractions are not introduced
- naming is clear and consistent

---

## Documentation

If the change affects system behavior, verify that documentation is updated:

- architecture changes → update "architecture.md"
- API changes → update "api-contracts.md"
- schema changes → update "data-model.md"
- security changes → update "security.md"

---

## Git Workflow

Before committing:

- ensure commits represent one logical change
- commit messages follow Conventional Commits
- large unrelated changes are split into separate commits

Before opening a pull request:

- branch follows "git-workflow.md"
- PR description explains the change
- feature branch targets "develop"

---

## Pre-Commit Quick Check

Before committing, quickly verify:

- project builds successfully
- no syntax errors
- code formatting is correct
- environment variables are not committed
- sensitive data is not present in code

---

## Summary

Before committing or opening a PR:

verify architecture
check API contracts
confirm data model consistency
review security rules
ensure tests pass
update documentation if needed

Following this checklist helps keep the codebase stable, secure, and maintainable. 
