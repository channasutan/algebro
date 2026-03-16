# Phase 2 Execution Plan

## Purpose

Phase 2 delivers user identity for the modular monolith: Supabase-backed authentication, a user profile module, and reusable scaffolding for future modules.

This plan assumes the current Phase 1 repository state:

- shared infrastructure already exists for events, jobs, Supabase clients, adapters, and environment configuration
- domain modules are still mostly placeholders
- the app layer should remain thin and should not accumulate business logic

## Planning Assumptions

- `auth.users` remains the identity source managed by Supabase Auth.
- `public.users` remains the canonical Phase 2 profile table because the current schema and foreign keys already point to it.
- The `user-profiles` module owns `public.users` and extends it with profile fields instead of introducing a separate `profiles` table in Phase 2.
- Profile bootstrap uses two complementary paths:
  - eager bootstrap from the `auth_user_registered` event after successful sign-up
  - lazy bootstrap from `getCurrentProfile` if the event was missed or the subscriber was temporarily unavailable
- Both bootstrap paths must converge on the same idempotent repository operation so duplicate creation attempts are safe.
- Core sign-up, sign-in, sign-out, session lookup, and profile update flows remain synchronous. Jobs are reserved only for optional non-blocking follow-up work.

## Architectural Guardrails

- Keep `app/` thin. Pages, route handlers, and server actions should validate, authenticate, call module public APIs, and shape responses.
- Keep business rules inside modules.
- Do not let `authentication` import `user-profiles` internals, or vice versa.
- Use events for cross-module coordination and avoid direct module-to-module imports.
- Keep database access inside module repositories.
- Only module repository files may import `lib/supabase/*`.
- The app layer must never query Supabase directly.
- Reuse existing infrastructure: `events/`, `jobs/`, `lib/supabase/`, `config/env.*`, and existing adapters.
- Use the service-role Supabase client only inside repositories for privileged bootstrap or repair flows. User-scoped reads and updates should use the request-scoped server client so RLS applies.

## Transport Boundaries

- Server Components are the default transport for first-party reads.
- Server Actions are the default transport for first-party mutations.
- Route handlers exist only for external consumers, provider callbacks, and webhooks.
- The first-party web app must not call its own `/api/v1/*` endpoints for auth or profile flows.

## Module Bootstrap Lifecycle

- `modules/bootstrap.ts` should export `ensureModulesBootstrapped()`.
- Every Phase 2 server entry point should call `ensureModulesBootstrapped()` before invoking module services:
  - `app/sign-up/actions.ts`
  - `app/sign-in/actions.ts`
  - `app/sign-out/actions.ts`
  - `app/profile/actions.ts`
  - `app/profile/page.tsx`
  - `app/auth/callback/route.ts`
  - any future external `/api/v1/*` route handlers
- `ensureModulesBootstrapped()` must use a module-scoped guard so repeated imports or calls register event subscribers and job handlers exactly once per server process.
- The registration order inside `modules/bootstrap.ts` should be deterministic:
  - shared registrations first
  - `authentication` module registrations next
  - `user-profiles` subscribers after the authentication module exists
  - optional job registrations last
- Client components must never import `modules/bootstrap.ts`.

## Target Module Boundaries

- `modules/authentication/` owns sign-up, sign-in, sign-out, session lookup, and auth callback orchestration.
- `modules/user-profiles/` owns profile bootstrap, profile reads, profile updates, and the `public.users` table.
- Future modules should follow the internal shape already documented in `docs/folder-structure.md`:
  - `index.ts`
  - `contracts/`
  - `domain/`
  - `services/`
  - `repositories/`
  - `events/`
  - `tests/`
- Avoid monolithic contract files. Split contracts by use case or aggregate boundary, for example:
  - `contracts/sign-up.ts`
  - `contracts/sign-in.ts`
  - `contracts/session.ts`
  - `contracts/get-profile.ts`
  - `contracts/update-profile.ts`
  - `contracts/index.ts`

## Required Event Definitions

| Event | Producer | Primary Consumer | Payload |
| --- | --- | --- | --- |
| `auth_user_registered` | `authentication` | `user-profiles` | `userId`, `email`, `registeredAt`, `source` |
| `user_profile_initialized` | `user-profiles` | future modules, optional onboarding hooks | `userId`, `email`, `displayName`, `initializedAt`, `initializationSource` |
| `user_profile_updated` | `user-profiles` | future modules that react to profile metadata or settings changes | `userId`, `changedFields`, `updatedAt` |

Notes:

- Keep payloads stable and small. Prefer identifiers and audit metadata over denormalized internal state.
- Do not add sign-in or sign-out domain events in the baseline slice unless an actual consumer appears.
- `auth_user_registered` must be emitted only after a successful auth registration.
- `user-profiles` must not subscribe to `auth_user_registered` until the authentication module producer exists.
- `user_profile_initialized` should be emitted only when a profile row is actually created, whether creation came from the event-driven path or the lazy fallback path.
- Event handling must be idempotent because callback retries, duplicate form submissions, and subscriber restarts are all possible.

## API Route Structure

Required Phase 2 route handlers:

- `app/auth/callback/route.ts`
  - handles Supabase auth code exchange and redirect completion

Reserved external API surface, not part of the baseline first-party Phase 2 implementation:

- `app/api/v1/auth/session/route.ts`
- `app/api/v1/auth/signout/route.ts`
- `app/api/v1/profile/route.ts`

Rules:

- Add `/api/v1/*` endpoints only if an external consumer appears, such as a mobile app, third-party integration, or public API client.
- If these endpoints are added later, they must call module services and must not query Supabase directly.

## Server Actions

First-party UI mutations should use server actions:

- `app/sign-up/actions.ts`
  - `signUpAction`
- `app/sign-in/actions.ts`
  - `signInAction`
- `app/sign-out/actions.ts`
  - `signOutAction`
- `app/profile/actions.ts`
  - `updateProfileAction`

Rules:

- Each action should call `ensureModulesBootstrapped()` before invoking module services.
- Each action should delegate to a module service.
- Each action should return transport-safe validation errors, not raw Supabase errors.
- Actions should not write directly to tables.

## Supabase Database Interaction

- `authentication` interacts with Supabase Auth through a repository that wraps the request-scoped server client and, where strictly necessary, the admin client.
- `user-profiles` is the only module allowed to read or write `public.users`.
- Add profile columns to `public.users` instead of creating a second user table in Phase 2.
- Add explicit RLS policies for `public.users` because the table currently has RLS enabled but no usable user policies.
- Both the event-driven bootstrap path and the lazy `getCurrentProfile` fallback must use the same idempotent profile-creation repository operation.
- Only repositories may import `lib/supabase/*`; services, events, server actions, pages, and route handlers must depend on repositories indirectly through module public APIs.

## Job Usage

No dedicated job is required for the baseline Phase 2 slice.

Only introduce a job if Phase 2 expands to include a non-blocking side effect such as:

- welcome email dispatch
- avatar import or enrichment
- audit backfill

If a job is added:

- enqueue it from an event consumer, not from the app layer
- register it through `modules/bootstrap.ts`
- keep auth and profile correctness independent of job-runner availability

## Sequential Tasks

### Task 1 - Stabilize the identity model

Objective: lock the Phase 2 user model before implementation begins by making `public.users` the profile aggregate owned by `user-profiles`, then define the additional columns needed for profile features.

Files to create or modify:

- `docs/implementation-roadmap.md`
- `docs/database-schema.md`
- `docs/data-model.md`
- `docs/modules.md`
- `supabase/migrations/<timestamp>_extend_users_for_profiles.sql`

Dependencies:

- None

Acceptance criteria:

- The roadmap's `profiles` wording is reconciled with the existing `public.users` schema.
- `public.users` is documented as the owned persistence model for the `user-profiles` module.
- The migration adds the minimum Phase 2 profile fields, such as `display_name`, `avatar_url`, `timezone`, and `updated_at`, without breaking existing foreign keys.
- The migration is idempotent and safe to run on top of the existing baseline.
- The schema notes make clear that profile creation is idempotent and may occur from either the event-driven path or the lazy fallback path.

Tests required:

- Migration smoke test against a fresh local database.
- Schema regression test confirming existing foreign keys to `public.users` still validate.

### Task 2 - Upgrade Supabase auth infrastructure and enforce repository boundaries

Objective: replace the current sessionless server Supabase client path with a request-scoped auth client, and enforce the rule that only repositories may import Supabase clients.

Files to create or modify:

- `package.json`
- `package-lock.json`
- `lib/supabase/server-client.ts`
- `lib/supabase/browser-client.ts`
- `config/env.public.ts`
- `config/env.server.ts`
- `config/env.ts`
- `architecture.yml`
- `docs/development-rules.md`
- `tests/integration/supabase-client.test.ts`
- `tests/integration/env-smoke.test.ts`
- `tests/integration/module-boundaries.test.ts`

Dependencies:

- Task 1

Acceptance criteria:

- Server-side auth reads and writes session cookies per request instead of using a singleton anonymous client.
- The browser client remains the only browser-safe Supabase entry point.
- Any new site URL or callback URL environment variable is validated through the existing config layer.
- Only repository files may import `lib/supabase/*`.
- The app layer and non-repository module layers are forbidden from importing `lib/supabase/*`.
- No route, server action, or module reads raw `process.env` directly.

Tests required:

- Integration test proving the server client can exchange or read an authenticated session in a request-scoped context.
- Env smoke test covering any newly introduced public or server-only auth variables.
- Import-boundary test proving `app/` and non-repository module layers cannot import `lib/supabase/*`.

### Task 3 - Add module bootstrap and scaffold the Phase 2 modules

Objective: create the `authentication` and `user-profiles` module skeletons, split contracts into smaller files, and define the server bootstrap pattern that registers subscribers and handlers exactly once.

Files to create or modify:

- `modules/bootstrap.ts`
- `modules/authentication/index.ts`
- `modules/authentication/contracts/index.ts`
- `modules/authentication/contracts/sign-up.ts`
- `modules/authentication/contracts/sign-in.ts`
- `modules/authentication/contracts/session.ts`
- `modules/authentication/domain/auth-session.ts`
- `modules/user-profiles/index.ts`
- `modules/user-profiles/contracts/index.ts`
- `modules/user-profiles/contracts/get-profile.ts`
- `modules/user-profiles/contracts/update-profile.ts`
- `modules/user-profiles/domain/profile.ts`
- `docs/folder-structure.md`
- `docs/modules.md`

Dependencies:

- Task 2

Acceptance criteria:

- Both Phase 2 modules exist with the standard internal structure already defined in the repository.
- Contracts are split by use case instead of being combined into large catch-all files.
- `modules/bootstrap.ts` exposes `ensureModulesBootstrapped()`.
- The bootstrap contract documents which server entry points must call it.
- Repeated bootstrap calls are safe and do not create duplicate event subscriptions or job registrations.
- No new direct module-to-module imports are introduced.

Tests required:

- Bootstrap idempotency test confirming repeated registration does not create duplicate event subscriptions.
- Smoke tests confirming both modules can be imported through their public `index.ts` files without reaching into internals.

### Task 4 - Define the shared Phase 2 event contracts

Objective: add the shared auth and profile event definitions that modules will publish and consume during Phase 2.

Files to create or modify:

- `events/event-types.ts`
- `types/events.ts`
- `modules/authentication/events/auth-user-registered.ts`
- `modules/user-profiles/events/user-profile-initialized.ts`
- `modules/user-profiles/events/user-profile-updated.ts`
- `tests/integration/event-types.test.ts`

Dependencies:

- Task 3

Acceptance criteria:

- `auth_user_registered`, `user_profile_initialized`, and `user_profile_updated` are added to the shared event contract.
- Event payloads are immutable, serializable, and limited to stable identifiers plus metadata.
- The event definitions are available before module service implementation begins.
- Subscription wiring for `auth_user_registered` is deferred until after the authentication producer exists.

Tests required:

- Event contract test covering the new event type union and payload creation.

### Task 5 - Build the authentication module and the auth event producer

Objective: encapsulate Supabase Auth operations inside the `authentication` module and publish `auth_user_registered` after successful registration.

Files to create or modify:

- `modules/authentication/repositories/supabase-auth-repository.ts`
- `modules/authentication/services/sign-up-user.ts`
- `modules/authentication/services/sign-in-user.ts`
- `modules/authentication/services/sign-out-user.ts`
- `modules/authentication/services/get-current-session.ts`
- `modules/authentication/services/handle-auth-callback.ts`
- `modules/authentication/tests/authentication-service.test.ts`
- `tests/integration/authentication-module.test.ts`
- `tests/integration/event-bus.test.ts`

Dependencies:

- Task 2
- Task 3
- Task 4

Acceptance criteria:

- The `authentication` module owns sign-up, sign-in, sign-out, session lookup, and auth callback exchange orchestration.
- The module depends on Supabase through its repository layer only.
- The module does not import `user-profiles` services or repositories directly.
- Successful sign-up publishes `auth_user_registered`.
- Failed or rolled-back sign-up attempts do not publish `auth_user_registered`.

Tests required:

- Unit tests for sign-up, sign-in, sign-out, and session lookup behavior with mocked repository responses.
- Integration test confirming `auth_user_registered` is emitted only after successful registration.

### Task 6 - Build the user-profiles module, lazy bootstrap fallback, and auth event consumer

Objective: implement the repository and services that own `public.users`, subscribe to `auth_user_registered`, and lazily initialize a profile when `getCurrentProfile` finds no row.

Files to create or modify:

- `supabase/migrations/<timestamp>_add_users_rls_policies.sql`
- `modules/user-profiles/repositories/supabase-profile-repository.ts`
- `modules/user-profiles/services/ensure-profile-exists.ts`
- `modules/user-profiles/services/get-current-profile.ts`
- `modules/user-profiles/services/update-profile.ts`
- `modules/user-profiles/events/on-auth-user-registered.ts`
- `modules/user-profiles/tests/user-profile-service.test.ts`
- `tests/integration/user-profiles-module.test.ts`
- `tests/integration/auth-profile-flow.test.ts`
- `tests/integration/event-bus.test.ts`

Dependencies:

- Task 1
- Task 3
- Task 4
- Task 5

Acceptance criteria:

- `user-profiles` is the only module that reads or writes `public.users`.
- `user-profiles` subscribes to `auth_user_registered` only after the authentication producer exists.
- Both the event-driven bootstrap path and the lazy `getCurrentProfile` fallback use the same idempotent `ensure-profile-exists` behavior.
- `getCurrentProfile` creates a missing profile safely if the auth event was missed.
- Duplicate bootstrap attempts do not create duplicate rows or inconsistent state.
- RLS policies allow a user to read and update only their own row.
- Any privileged bootstrap or repair path uses the admin client inside the repository, not from the route or action layer.
- `user_profile_initialized` is emitted only when a new profile row is created.
- `user_profile_updated` is emitted after successful updates.

Tests required:

- Unit tests for profile bootstrap, retrieval, and update services.
- Integration test for RLS behavior on `public.users`.
- Integration test proving duplicate initialization requests do not create duplicate rows.
- Cross-module integration test covering:
  - sign up
  - `auth_user_registered` event emitted
  - profile bootstrap
  - profile retrieval

### Task 7 - Add the first-party authentication transport layer

Objective: expose sign-up, sign-in, sign-out, and auth callback flows through server actions and the required provider callback route without adding internal API dependencies.

Files to create or modify:

- `app/sign-up/page.tsx`
- `app/sign-up/actions.ts`
- `app/sign-in/page.tsx`
- `app/sign-in/actions.ts`
- `app/sign-out/actions.ts`
- `app/auth/callback/route.ts`
- `app/layout.tsx`

Dependencies:

- Task 5
- Task 6

Acceptance criteria:

- Sign-up, sign-in, and sign-out use server actions for the first-party UI.
- The auth callback route exchanges the Supabase auth code and completes the redirect flow.
- Each server entry point calls `ensureModulesBootstrapped()` before invoking module services.
- The first-party auth flow does not call `/api/v1/auth/*`.
- The app layer does not import `lib/supabase/*`.
- `app/layout.tsx` or an equivalent shared server boundary can surface authenticated state without duplicating auth logic.

Tests required:

- Server action tests for sign-up, sign-in, and sign-out happy paths and validation failure cases.
- Route handler test for the auth callback behavior.
- Integration test covering the roadmap's sign-up, login, and session persistence requirements.

### Task 8 - Add the first-party profile transport layer

Objective: expose current-user profile reads through a server component and profile updates through a server action without introducing internal API routes.

Files to create or modify:

- `app/profile/page.tsx`
- `app/profile/actions.ts`

Dependencies:

- Task 6
- Task 7

Acceptance criteria:

- The profile page reads data through the `user-profiles` module from a server component.
- `updateProfileAction` delegates to the `user-profiles` module and returns transport-safe validation errors.
- The first-party profile flow does not call `/api/v1/profile`.
- The app layer does not import `lib/supabase/*`.
- A missing profile discovered during page load is repaired through the lazy bootstrap path, not through ad hoc app-layer database access.

Tests required:

- Server action test for profile update success and validation failure.
- Integration test covering first authenticated profile read and profile update behavior.

### Task 9 - Add reusable module scaffolding for future phases

Objective: make future feature modules cheap to add while preserving the repository's module conventions, contract structure, and dependency boundaries.

Files to create or modify:

- `scripts/scaffold-module.mjs`
- `docs/modules.md`
- `docs/folder-structure.md`
- `tests/integration/module-scaffold.test.ts`

Dependencies:

- Task 3

Acceptance criteria:

- A scaffold command can generate the standard module shape used by the repository.
- Generated modules include `index.ts`, `contracts`, `domain`, `services`, `repositories`, `events`, and `tests`.
- Generated contracts are split into smaller use-case files plus a public `contracts/index.ts`.
- The scaffold includes a placeholder registration hook for event subscriptions without creating direct imports to other modules.
- The docs explain when to use events, when to use jobs, when server actions are preferred, and when a route handler is justified for an external consumer.

Tests required:

- Scaffold smoke test verifying the expected files are generated.
- Snapshot or structural test ensuring the generated layout matches the documented module template.

### Task 10 - Add background job hooks only if Phase 2 grows non-blocking side effects

Objective: preserve the existing job runner as an extension point without making baseline auth or profile correctness depend on asynchronous processing.

Files to create or modify:

- `jobs/handlers/profile-bootstrap.ts`
- `jobs/job-runner.ts`
- `modules/bootstrap.ts`
- `tests/integration/job-runner.test.ts`

Dependencies:

- Task 5
- Task 6
- Task 8

Acceptance criteria:

- This task is skipped unless Phase 2 adds a genuinely non-blocking side effect.
- If implemented, the job is enqueued from an event consumer, registered through `modules/bootstrap.ts`, and remains idempotent.
- Sign-up, sign-in, session handling, profile bootstrap, and profile reads or writes still succeed even when the job runner is unavailable.

Tests required:

- If a job is added, add integration tests for payload validation, retry behavior, and non-retryable failure handling.
- If no job is added, no extra job tests are required beyond the baseline auth and profile coverage.

## Phase 2 Exit Criteria

Phase 2 is complete when all of the following are true:

- users can sign up and sign in through Supabase Auth
- authenticated sessions are readable on the server
- `auth_user_registered` is emitted after successful registration
- a profile row is initialized in `public.users` after successful registration or repaired lazily on first authenticated profile read if the event was missed
- users can view and update their own profile through the `user-profiles` module
- auth and profile modules coordinate through events instead of direct internal imports
- only module repositories import `lib/supabase/*`
- first-party UI flows use server actions and server components, not internal `/api/v1/*` calls
- future modules can be scaffolded with the same structure and boundaries already used in the repository
