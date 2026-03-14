# Phase 1 Execution Plan

## Phase 1 Goal

Finish shared infrastructure so it is operational, test-covered, and aligned with the project documentation before moving deeper into feature modules.

## Definition of Done

- Infrastructure contracts are complete for:
  - event bus
  - job runner
  - Supabase client
  - Gemini adapter
  - SymPy adapter
  - Mayar adapter
  - Supabase Realtime adapter
- Integration tests exist for all Phase 1 adapters and core runtime primitives.
- Documentation matches implementation for:
  - payment provider
  - Supabase client path
  - env/config structure
  - Phase 1 roadmap expectations
- Validation commands pass:
  - `npm run test`
  - `npm run build`
  - `npm run lint` if enabled as acceptance criteria

## Execution Order

1. finalize shared event contracts
2. finalize the global event bus runtime interface
3. finalize the background job runner contract
4. add a minimal placeholder job handler proof point
5. finalize env/config accessors for infrastructure
6. harden Supabase client boundary separation
7. complete external adapter skeletons
8. add integration coverage for runtime primitives and adapters
9. align documentation with the implemented structure
10. run final validation and acceptance commands

## Commit-by-Commit Sequence

1. [x] `refactor(events): finalize domain event contract`
   - Short description: stabilize the shared event envelope and helper types so Phase 1 has one canonical event shape.
   - Affected files/folders:
     - `events/event-types.ts`
   - Expected outcome:
     - event payload, ids, timestamps, and shared handler types are finalized
     - downstream event bus and tests can safely depend on this contract

2. [x] `refactor(events): finalize event bus interface`
   - Short description: complete the publish/subscribe/unsubscribe runtime contract for the global event bus.
   - Affected files/folders:
     - `events/event-bus.ts`
   - Expected outcome:
     - event bus behavior is explicit and reusable
     - no business logic is introduced
     - event tests can now be written against a stable runtime

3. [x] `refactor(jobs): finalize job runner contract`
   - Short description: complete the minimal job runner API, retry semantics, and queue-claim contract for the background job system.
   - Affected files/folders:
     - `jobs/job-runner.ts`
   - Expected outcome:
     - job execution result states are defined
     - retry behavior is explicit
     - queue claim SQL matches the documented DB job queue pattern

4. [x] `chore(jobs): add placeholder job handler contract`
   - Short description: add one minimal handler proof point to demonstrate the runner-to-handler integration shape.
   - Affected files/folders:
     - `jobs/handlers/`
   - Expected outcome:
     - there is at least one placeholder handler module
     - downstream job tests can validate realistic registration/use patterns

5. [x] `refactor(config): finalize server env accessors`
   - Short description: stabilize public vs server-only env access and expose the minimal infrastructure secret readers required by adapters.
   - Affected files/folders:
     - `config/env.ts`
     - `config/env.public.ts`
     - `config/env.server.ts`
     - `config/env.server-entry.ts`
     - `config/env.client.ts`
   - Expected outcome:
     - required public and server env access paths are clear
     - server-only secret access is centralized
     - adapter implementations can depend on finalized env helpers

6. [x] `refactor(supabase): harden client boundary separation`
   - Short description: complete the browser/server/admin Supabase client structure and ensure service-role access remains server-only.
   - Affected files/folders:
     - `lib/supabase/client.ts`
   - Expected outcome:
     - browser client uses anon key only
     - server client uses anon key only
     - admin client uses service-role key only
     - secret-bearing code paths are isolated from browser-safe imports

7. [x] `feat(infra): complete ai adapter skeleton`
   - Short description: finish the minimal Gemini adapter runtime contract with config detection, request construction, and stable error behavior.
   - Affected files/folders:
     - `infrastructure/ai/gemini-client.ts`
   - Expected outcome:
     - AI adapter is operational as infrastructure-only code
     - no business logic is added
     - adapter tests can now target a stable API

8. [x] `feat(infra): complete math adapter skeleton`
   - Short description: finish the minimal SymPy adapter runtime contract with base URL handling, request shape, and explicit errors.
   - Affected files/folders:
     - `infrastructure/math/sympy-client.ts`
   - Expected outcome:
     - SymPy adapter is callable and predictable
     - no math-domain business logic is implemented
     - adapter tests can now target a stable API

9. [x] `feat(infra): complete payments adapter skeleton`
   - Short description: finish the minimal Mayar adapter contract including configuration detection, checkout request shape, payment lookup, and webhook secret access.
   - Affected files/folders:
     - `infrastructure/payments/mayar-client.ts`
   - Expected outcome:
     - payment infrastructure aligns with docs
     - billing-facing runtime primitives are ready for later modules
     - adapter tests can now target a stable API

10. [x] `feat(infra): complete realtime adapter skeleton`
    - Short description: finish the minimal Supabase Realtime adapter with channel creation, subscribe lifecycle, and close behavior.
    - Affected files/folders:
      - `infrastructure/realtime/supabase-realtime.ts`
    - Expected outcome:
      - realtime infrastructure contract is complete
      - PvP-related modules can depend on it later
      - adapter tests can now target a stable API

11. [x] `test(events): add event bus integration coverage`
    - Short description: add integration tests for publish, unsubscribe, and multi-subscriber event behavior.
    - Affected files/folders:
      - `tests/integration/event-bus.test.ts`
    - Expected outcome:
      - event bus runtime behavior is verified
      - event contract regressions are easier to catch

12. [x] `test(jobs): add job runner integration coverage`
    - Short description: add integration tests for success, retryable failure, terminal failure, and missing-handler behavior.
    - Affected files/folders:
      - `tests/integration/job-runner.test.ts`
    - Expected outcome:
      - job runner semantics are verified against the finalized runtime contract

13. [x] `test(supabase): add client boundary integration tests`
    - Short description: add tests for browser/server/admin Supabase client factories and server-only guard behavior.
    - Affected files/folders:
      - `tests/integration/`
      - `lib/supabase/client.ts`
    - Expected outcome:
      - Supabase client boundary rules are verified
      - service-role leakage risks are checked in test form

14. [x] `test(infra): add gemini adapter tests`
    - Short description: add tests for Gemini config detection, request construction, and error handling.
    - Affected files/folders:
      - `tests/integration/`
      - `infrastructure/ai/gemini-client.ts`
    - Expected outcome:
      - AI adapter behavior is validated independently of modules

15. [x] `test(infra): add sympy adapter tests`
    - Short description: add tests for SymPy base URL handling, payload shape, and non-200 error behavior.
    - Affected files/folders:
      - `tests/integration/`
      - `infrastructure/math/sympy-client.ts`
    - Expected outcome:
      - math adapter request contract is verified

16. [x] `test(infra): add mayar adapter tests`
    - Short description: add tests for Mayar auth headers, checkout payload, payment lookup path, and webhook secret access.
    - Affected files/folders:
      - `tests/integration/`
      - `infrastructure/payments/mayar-client.ts`
    - Expected outcome:
      - payments adapter behavior is verified against the documented provider setup

17. [x] `test(infra): add realtime adapter tests`
    - Short description: add tests for realtime channel creation, subscribe success/failure, and close behavior.
    - Affected files/folders:
      - `tests/integration/`
      - `infrastructure/realtime/supabase-realtime.ts`
    - Expected outcome:
      - realtime adapter lifecycle behavior is covered

18. [x] `test(config): add environment smoke tests`
    - Short description: add lightweight tests for public/server env validation and optional infrastructure overrides.
    - Affected files/folders:
      - `tests/integration/`
      - `config/`
    - Expected outcome:
      - env loading rules are verified
      - missing/blank configuration failures are explicit in tests

19. [ ] `docs(roadmap): align phase 1 references with implementation`
    - Short description: update Phase 1 roadmap references so payment provider, Supabase client path, and scope descriptions match the implemented infrastructure.
    - Affected files/folders:
      - `docs/implementation-roadmap.md`
    - Expected outcome:
      - roadmap matches the actual Phase 1 implementation direction

20. [ ] `docs(architecture): align config and infrastructure documentation`
    - Short description: update docs to reflect the finalized env structure and current infrastructure file layout.
    - Affected files/folders:
      - `docs/folder-structure.md`
      - `docs/architecture.md`
      - related config/infrastructure docs as needed
    - Expected outcome:
      - docs match the actual repository structure
      - no ambiguity remains around env/config organization

21. [ ] `docs(modules): clarify phase 1 infrastructure vs module completion`
    - Short description: document that Phase 1 completes shared infrastructure, while module business logic remains future work.
    - Affected files/folders:
      - `docs/modules.md`
      - `docs/implementation-roadmap.md`
    - Expected outcome:
      - audit expectations become clearer
      - infrastructure completion is not confused with module implementation

22. [ ] `chore(phase1): finalize validation baseline`
    - Short description: run the final Phase 1 acceptance pass and make any minimal non-functional adjustments needed so the standard validation commands succeed.
    - Affected files/folders:
      - repo-wide, only if needed for non-functional validation fixes
    - Expected outcome:
      - `npm run test` passes
      - `npm run build` passes
      - `npm run lint` passes if enabled
      - Phase 1 can be considered complete

## Dependency Notes

- Commits 1-10 must come before the related test commits.
- Commit 4 depends on commit 3.
- Commit 6 depends on commit 5.
- Commits 11-18 depend on the corresponding runtime/infrastructure commit being present first.
- Commits 19-21 should happen after the implementation shape is stable.
- Commit 22 is the final gate and should be last.

## Recommended Review Grouping

- Group A: commits 1-6 for shared infrastructure contracts
- Group B: commits 7-10 for external adapter completion
- Group C: commits 11-18 for integration coverage
- Group D: commits 19-21 for documentation alignment
- Group E: commit 22 for final acceptance verification

## Parallelization Notes

- Parallel lane A:
  - event contract finalization
  - event bus finalization
  - event tests after runtime is stable
- Parallel lane B:
  - job runner finalization
  - placeholder handler addition
  - job tests after runtime is stable
- Parallel lane C:
  - adapter completion across AI, math, payments, and realtime
  - adapter tests after each adapter contract is stable
- Parallel lane D:
  - documentation cleanup that does not depend on final code shape
- Final merge point:
  - config validation
  - full `npm run test`
  - full `npm run build`
  - full `npm run lint` if enabled
