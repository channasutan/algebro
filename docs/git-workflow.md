Overview

This document defines the Git workflow used in this project.

The goals are:

- keep the repository organized
- enable safe development
- simplify code review
- maintain stable production releases

The workflow is intentionally simple and suitable for MVP development and AI-assisted coding.

---

Branch Structure

The repository uses a simple branching strategy.

main
└── feature/*

---

main

The main branch represents production-ready code.

Rules:

- direct commits are not allowed
- all changes must go through pull requests
- production deployments are triggered from this branch

---

Feature Branches

New work must be implemented in feature branches.

Branch naming format:

feature/<feature-name>

Examples:

feature/practice-engine
feature/step-validation
feature/ai-hints
feature/material-processing
feature/pvp-duel

Feature branches are always created from main.

---

Development Workflow

Typical workflow:

main
↓
feature/*
↓
Pull Request
↓
merge into main
↓
production deployment

Steps:

1. Checkout main

git checkout main

2. Create feature branch

git checkout -b feature/<feature-name>

3. Implement the feature.

4. Commit logical changes.

5. Push branch

git push origin feature/<feature-name>

6. Open Pull Request to main.

7. After review, merge into main.

---

Commit Strategy

Commits should represent one logical change.

Examples of logical changes:

- creating a service module
- adding an API route
- implementing validation logic
- adding a database migration
- adding tests

Recommended commit size:

- small and focused
- typically 10–100 lines of change

Avoid large commits containing multiple unrelated changes.

---

Commit Convention

Commits follow the Conventional Commits format.

Format:

type(scope): message

Examples:

feat(practice): create practice session API
feat(ai): add hint generation endpoint
fix(validation): handle invalid step input
refactor(practice): extract service layer
docs(architecture): update module documentation
test(practice): add practice unit tests

Commit types:

feat
fix
refactor
docs
test
chore

---

When to Create a New Branch

Create a new branch when starting an independent feature or task.

Examples:

- implementing a new module
- starting a new roadmap feature
- fixing a bug
- making architectural changes

Example branches:

feature/practice-engine
feature/step-validation
feature/ai-hints
feature/material-upload

---

When to Continue Using the Same Branch

Continue using the same branch when working on the same feature.

Example branch:

feature/practice-engine

Possible commits inside that branch:

feat(practice): create practice service
feat(practice): add start practice API
feat(practice): implement session initialization
test(practice): add practice tests

---

Rule of Thumb

Use this rule:

1 feature = 1 branch
multiple commits within the branch

This keeps development organized and Pull Requests easy to review.

---

Pull Requests

All changes must go through Pull Requests.

Pull Request rules:

- PR must target the main branch
- PR description must explain the change
- large features should be split into smaller PRs
- code must follow project documentation

Important references:

- architecture.md
- api-contracts.md
- data-model.md
- security.md

---

Code Review Checklist

Before merging, reviewers should verify:

Architecture

- follows architecture.md
- respects module boundaries

API

- matches api-contracts.md
- no undocumented endpoints

Data

- follows data-model.md
- migrations included when schema changes occur

Security

- no secrets exposed
- input validation implemented
- authorization rules respected

Testing

- tests exist for new logic when applicable
- existing tests still pass

---

Merge Strategy

Use Squash and Merge for feature branches.

Benefits:

- clean commit history
- one commit per feature
- easier rollback

Example history:

feat(practice): implement practice engine
feat(validation): implement step validation
feat(ai): add hint generation

---

Deployment Flow

Deployment follows this flow:
[13/03/26 09.01] Sutansyah: feature/* → preview deployment
main → production deployment

Preview deployments allow testing before merging.

Production releases occur only from main.

---

Closing Branches

After a Pull Request is merged:

- delete the feature branch
- continue development from main

This keeps the repository clean and avoids unused branches.

---

Summary

Development flow:

create feature branch
↓
implement logical changes
↓
commit changes
↓
push branch
↓
open pull request
↓
review and merge into main
↓
production deployment

This workflow keeps development structured while remaining lightweight for MVP development and AI-assisted coding.