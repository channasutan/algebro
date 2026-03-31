# Phase 8 Execution Plan

## Purpose

Phase 8 delivers AI-powered tutoring for the algebra learning platform. The module integrates the existing `gemini-client` infrastructure to generate contextual hints based on incorrect student steps, enforces per-user hint quotas tracked in `ai_hint_usage`, and respects subscription plan limits enforced by the billing module.

This plan assumes the current Phase 7 repository state:

- authentication, user-profiles, practice, step-validation, problem-generator, curriculum, and material-processing modules are complete
- `infrastructure/ai/gemini-client.ts` is operational and uses `getAiProviderApiKey()` for server-side API calls
- `ai_hint_usage` table exists in the database schema with `user_id`, `problem_id`, `hint_count`, and `created_at` fields
- the event bus and job runner are operational
- the billing module owns `subscriptions` and exposes `checkFeatureAccess()`
- module bootstrap lifecycle is established through `modules/bootstrap.ts`

---

## Planning Assumptions

- The AI Tutor module owns the `ai_hint_usage` table exclusively.
- Hint generation calls `gemini-client.generateContent()` using `gemini-2.0-flash` as the model string, consistent with the existing client interface.
- Hint quota is tracked per `(user_id, problem_id)` pair. Each row is upserted; `hint_count` is incremented atomically.
- Free-tier users have a per-problem hint quota enforced before any Gemini API call is made.
- Premium users bypass the per-problem quota but remain subject to a daily rate limit if configured.
- Quota enforcement uses the billing module's `checkFeatureAccess()` to determine plan tier before checking `ai_hint_usage`.
- Hint prompts are constructed server-side and never exposed to the client in raw form.
- The Gemini API is called exclusively from server contexts — server actions or route handlers — never from client components.
- `server-only` is imported at the top of every AI Tutor service file to prevent accidental client-side bundling.
- The module emits `ai_hint_requested` after a successful hint generation.

---

## Architectural Guardrails

- `modules/ai-tutor/` owns `ai_hint_usage` reads and writes through its own repository.
- The module depends on `modules/billing/` only through its public API — `checkFeatureAccess()`. It must not import billing internals.
- The module depends on `modules/practice/` and `modules/step-validation/` only through their public contracts to retrieve attempt context and step error types.
- The `gemini-client` is consumed only inside the AI Tutor repository layer, not from services or app layer.
- Prompt construction logic lives inside the `ai-tutor` module domain — not inside `infrastructure/ai/`.
- All AI calls use `AbortSignal` with a timeout to prevent hanging requests.
- Responses from Gemini are validated and sanitized before being returned to the client.
- The app layer must not import `infrastructure/ai/gemini-client.ts` directly.

---

## Transport Boundaries

- `generateHintAction` is a Next.js 16 Server Action consumed by the practice UI.
- Server Actions are the only first-party transport for hint requests; no `/api/v1/ai-tutor/*` route is required unless a mobile client appears.
- `use server` directive is placed at the top of the actions file.
- `useActionState` (React 19) is used on the client to handle pending and error states from `generateHintAction`.

---

## Module Structure

```
modules/ai-tutor/
  index.ts
  contracts/
    generate-hint.ts
    check-quota.ts
    index.ts
  domain/
    hint-prompt.ts
    quota-policy.ts
  services/
    generate-hint.ts
    check-hint-quota.ts
  repositories/
    supabase-ai-tutor-repository.ts
  events/
    ai-hint-requested.ts
  tests/
    ai-tutor-service.test.ts
```

---

## Required Event Definitions

| Event | Producer | Primary Consumer | Payload |
| --- | --- | --- | --- |
| `ai_hint_requested` | `ai-tutor` | future analytics, gamification hooks | `userId`, `problemId`, `hintCount`, `requestedAt` |

Notes:

- Emit `ai_hint_requested` only after a successful Gemini response and a successful `ai_hint_usage` upsert.
- Do not emit the event if quota is exceeded or if the Gemini call fails.
- Keep the payload small and stable; do not include raw hint text in the event.

---

## Gemini Integration Details

The existing `gemini-client.ts` uses direct REST calls to the Gemini API v1beta endpoint at `https://generativelanguage.googleapis.com/v1beta`. Phase 8 uses this client as-is.

Model string: `gemini-2.0-flash`

Prompt structure for hint generation:

```
System: You are a mathematics tutor helping a student learn algebra step-by-step.
        Provide a concise hint (2–3 sentences) that guides the student without
        revealing the full solution. Focus on the algebraic rule or property
        that applies to the current mistake.

User:   Problem: {latex_problem}
        Student's incorrect step: {student_step_latex}
        Error type: {error_type}
        Previous steps: {previous_steps_latex}
        Hint number: {hint_count} of {max_hints}
```

Response validation:

- Confirm `candidates[0].content.parts[0].text` exists and is a non-empty string.
- Truncate to a maximum of 500 characters if the response exceeds the limit.
- If `promptFeedback.blockReason` is present, return a safe fallback message instead of throwing.

---

## Quota Policy

| Plan | Max hints per problem | Daily cap |
| --- | --- | --- |
| free | 3 | — |
| premium | unlimited | configurable via env |

Quota check order:

1. Call `checkFeatureAccess(userId, 'ai_hints')` from the billing module.
2. If free tier, fetch current `hint_count` from `ai_hint_usage` for `(user_id, problem_id)`.
3. If `hint_count >= FREE_HINT_LIMIT`, return a quota-exceeded result — do not call Gemini.
4. If quota permits, call Gemini, then upsert `ai_hint_usage` incrementing `hint_count`.

---

## API Route Structure

No dedicated route handler is required for the baseline Phase 8 slice.

Reserved external API surface for future mobile or third-party consumers:

- `app/api/v1/ai-tutor/hint/route.ts`

Rules:

- Add this endpoint only if a mobile client or external consumer appears.
- If added, it must call the `ai-tutor` module service and must not call `gemini-client` directly.

---

## Server Actions

- `app/practice/[sessionId]/actions.ts`
  - `generateHintAction(attemptId: string, stepIndex: number)`

Rules:

- Call `ensureModulesBootstrapped()` before invoking the AI Tutor service.
- Delegate to `modules/ai-tutor/` public API only.
- Return a transport-safe result discriminated union: `{ success: true; hint: string } | { success: false; reason: 'quota_exceeded' | 'ai_unavailable' | 'validation_error' }`.
- Never return raw Gemini API errors to the client.

---

## Supabase Database Interaction

- `ai_hint_usage` is owned exclusively by `modules/ai-tutor/repositories/supabase-ai-tutor-repository.ts`.
- No other module may read or write `ai_hint_usage`.
- Upsert strategy: `INSERT INTO ai_hint_usage ... ON CONFLICT (user_id, problem_id) DO UPDATE SET hint_count = hint_count + 1`.
- RLS policy: users may read their own `ai_hint_usage` rows. Writes are service-role only (server-side upserts bypass RLS using the admin client inside the repository).
- The repository uses the admin client for upserts and the user-scoped client for quota reads where RLS is sufficient.

---

## Sequential Tasks

### Task 1 — Extend env configuration for AI Tutor quota policy

Objective: introduce the `FREE_HINT_LIMIT` constant and any new AI Tutor environment variables into the validated config layer.

Files to create or modify:

- `config/env.server.ts`
- `config/env.ts`
- `docs/implementation-roadmap.md`
- `docs/database-schema.md`

Dependencies:

- None (planning task)

Acceptance criteria:

- `FREE_HINT_LIMIT` is exported from the server env config as a validated integer with a safe default of `3`.
- No raw `process.env` reads exist outside `config/`.
- The database schema doc notes that `ai_hint_usage` is exclusively owned by the `ai-tutor` module.
- The implementation roadmap Phase 8 section is updated to reference the execution plan.

Tests required:

- Env smoke test covering the new `FREE_HINT_LIMIT` variable.

---

### Task 2 — Scaffold the ai-tutor module and define contracts

Objective: create the `ai-tutor` module skeleton with use-case contracts, domain types, and the module's public `index.ts`.

Files to create or modify:

- `modules/ai-tutor/index.ts`
- `modules/ai-tutor/contracts/generate-hint.ts`
- `modules/ai-tutor/contracts/check-quota.ts`
- `modules/ai-tutor/contracts/index.ts`
- `modules/ai-tutor/domain/hint-prompt.ts`
- `modules/ai-tutor/domain/quota-policy.ts`
- `docs/modules.md`

Dependencies:

- Task 1

Acceptance criteria:

- `GenerateHintInput`, `GenerateHintResult`, `CheckQuotaInput`, and `CheckQuotaResult` are defined using Zod v4 schemas in their respective contract files.
- `GenerateHintResult` is a discriminated union: `{ success: true; hint: string } | { success: false; reason: QuotaExceededReason | AiUnavailableReason | ValidationErrorReason }`.
- `hint-prompt.ts` exports a pure `buildHintPrompt(input: HintPromptInput): GeminiContent[]` function that constructs the `GeminiContent[]` array compatible with `gemini-client.generateContent()`.
- `quota-policy.ts` exports `FREE_HINT_LIMIT` and a pure `isQuotaExceeded(hintCount: number, planTier: string): boolean` function.
- `modules/ai-tutor/index.ts` re-exports only public service functions.

Tests required:

- Unit tests for `buildHintPrompt` covering problem latex, student step, error type, and previous steps inputs.
- Unit tests for `isQuotaExceeded` covering free and premium tier edge cases.

---

### Task 3 — Implement the ai-tutor repository

Objective: build the Supabase repository that reads and upserts `ai_hint_usage` rows.

Files to create or modify:

- `modules/ai-tutor/repositories/supabase-ai-tutor-repository.ts`
- `supabase/migrations/<timestamp>_add_ai_hint_usage_rls_policies.sql`

Dependencies:

- Task 2

Acceptance criteria:

- `getHintUsage(userId, problemId)` returns the current `hint_count` for the pair, or `0` if no row exists.
- `incrementHintUsage(userId, problemId)` upserts the row and increments `hint_count` atomically using `ON CONFLICT DO UPDATE`.
- RLS migration adds a policy allowing users to `SELECT` their own rows.
- The repository uses the admin client for upserts (to bypass RLS) and the request-scoped client for reads where RLS applies.
- Only this repository file imports `lib/supabase/*`.

Tests required:

- Integration tests for `getHintUsage` with no existing row, existing row, and concurrent increment scenarios.
- RLS integration test confirming users cannot read other users' `ai_hint_usage` rows.

---

### Task 4 — Implement the check-hint-quota service

Objective: implement the service that combines billing plan tier lookup with `ai_hint_usage` to determine whether a user may request another hint.

Files to create or modify:

- `modules/ai-tutor/services/check-hint-quota.ts`
- `modules/ai-tutor/tests/ai-tutor-service.test.ts`

Dependencies:

- Task 2
- Task 3

Acceptance criteria:

- `checkHintQuota(input: CheckQuotaInput): Promise<CheckQuotaResult>` calls `checkFeatureAccess` from the billing module and then calls `getHintUsage` from the repository.
- For free-tier users: if `hint_count >= FREE_HINT_LIMIT`, returns `{ allowed: false, reason: 'quota_exceeded', remaining: 0 }`.
- For free-tier users within quota: returns `{ allowed: true, remaining: FREE_HINT_LIMIT - hint_count }`.
- For premium-tier users: returns `{ allowed: true, remaining: null }` (unlimited).
- The service does not call the Gemini API.
- The service does not import `infrastructure/ai/` directly.

Tests required:

- Unit tests for free-tier within quota, free-tier at quota, free-tier over quota, and premium-tier cases with mocked billing and repository responses.

---

### Task 5 — Implement the generate-hint service

Objective: implement the core AI hint generation service that orchestrates quota checking, prompt construction, Gemini API call, response validation, usage tracking, and event emission.

Files to create or modify:

- `modules/ai-tutor/services/generate-hint.ts`
- `modules/ai-tutor/events/ai-hint-requested.ts`
- `events/event-types.ts`
- `types/events.ts`
- `modules/ai-tutor/tests/ai-tutor-service.test.ts`

Dependencies:

- Task 2
- Task 3
- Task 4

Acceptance criteria:

- `generateHint(input: GenerateHintInput): Promise<GenerateHintResult>` performs the following steps in order:
  1. Calls `checkHintQuota` — short-circuits with `{ success: false, reason: 'quota_exceeded' }` if not allowed.
  2. Calls `buildHintPrompt` to construct the `GeminiContent[]` payload.
  3. Calls `gemini-client.generateContent()` with `model: 'gemini-2.0-flash'` and an `AbortSignal` with a 10-second timeout.
  4. Validates the response structure — returns `{ success: false, reason: 'ai_unavailable' }` if invalid.
  5. Checks for `promptFeedback.blockReason` — returns a safe fallback hint if content was blocked.
  6. Calls `incrementHintUsage` on the repository.
  7. Emits `ai_hint_requested`.
  8. Returns `{ success: true, hint: sanitizedHintText }`.
- `gemini-client` is imported only inside the repository layer; `generate-hint.ts` service receives the Gemini call result through a repository abstraction or an injected client interface.
- `ai_hint_requested` is added to `events/event-types.ts` and `types/events.ts`.
- Timeout is enforced using `AbortSignal.timeout(10_000)`.

Tests required:

- Unit tests for the happy path with mocked Gemini response.
- Unit tests for quota-exceeded short-circuit.
- Unit tests for Gemini unavailable (network error, timeout).
- Unit tests for blocked content fallback.
- Unit tests for usage increment after successful generation.

---

### Task 6 — Register the ai-tutor module in bootstrap

Objective: integrate the `ai-tutor` module into `modules/bootstrap.ts` so its event subscribers and any future job handlers are registered exactly once per server process.

Files to create or modify:

- `modules/bootstrap.ts`
- `modules/ai-tutor/index.ts`

Dependencies:

- Task 5

Acceptance criteria:

- `modules/bootstrap.ts` imports `ai-tutor` module registration and calls it as part of `ensureModulesBootstrapped()`.
- Registration order: `ai-tutor` is registered after `billing` and `practice` modules since it depends on their public APIs.
- Repeated `ensureModulesBootstrapped()` calls do not create duplicate `ai_hint_requested` subscriptions.
- Client components do not import `modules/bootstrap.ts`.

Tests required:

- Bootstrap idempotency test confirming repeated registration does not duplicate `ai_hint_requested` event subscriptions.

---

### Task 7 — Add the generateHintAction Server Action and practice UI integration

Objective: expose `generateHint` to the practice UI through a Next.js 16 Server Action that integrates with `useActionState` on the client.

Files to create or modify:

- `app/practice/[sessionId]/actions.ts`
- `app/practice/[sessionId]/page.tsx` (or relevant practice page)
- `app/practice/[sessionId]/components/hint-panel.tsx`

Dependencies:

- Task 5
- Task 6

Acceptance criteria:

- `generateHintAction` is defined with `'use server'` in `actions.ts` and accepts `(attemptId: string, stepIndex: number)`.
- The action calls `ensureModulesBootstrapped()` then delegates to `modules/ai-tutor/`.
- The action returns the discriminated union result directly to the client via `useActionState`.
- The `HintPanel` client component uses `useActionState` (React 19 API) to track the pending state and render the hint or an appropriate error message.
- When `reason: 'quota_exceeded'`, the UI displays the number of remaining hints (0) and a prompt to upgrade if on the free tier.
- When `reason: 'ai_unavailable'`, the UI displays a user-friendly retry message without exposing internal errors.
- The action does not import `infrastructure/ai/` or `lib/supabase/*` directly.
- `server-only` is imported in `actions.ts`.

Tests required:

- Server action tests for the happy path, quota-exceeded, and AI-unavailable cases.
- Component test for `HintPanel` rendering states: idle, pending, hint displayed, quota exceeded, and AI unavailable.

---

### Task 8 — Add integration and cross-module tests

Objective: add end-to-end integration coverage for the full hint request lifecycle including quota enforcement, Gemini interaction, usage tracking, and event emission.

Files to create or modify:

- `tests/integration/ai-tutor-module.test.ts`
- `tests/integration/ai-hint-quota.test.ts`
- `tests/integration/event-bus.test.ts`

Dependencies:

- Task 5
- Task 6
- Task 7

Acceptance criteria:

- Integration test covers the full happy path: user submits incorrect step → `generateHintAction` called → quota checked → Gemini responds → `ai_hint_usage` incremented → `ai_hint_requested` emitted → hint returned to client.
- Integration test covers quota enforcement: third hint succeeds, fourth hint returns `quota_exceeded` for a free-tier user.
- Integration test confirms `ai_hint_requested` is emitted exactly once per successful generation.
- Tests use Vitest 3 with `vi.mock` for the Gemini client and a real Supabase test database for repository tests.
- All tests run under `vitest run` and `vitest run --config vitest.config.integration.ts`.

Tests required:

- Full lifecycle integration test as described above.
- Quota boundary test (free tier at limit).
- Event emission assertion test.

---

## Phase 8 Exit Criteria

Phase 8 is complete when all of the following are true:

- students can request AI hints during practice sessions
- hints are generated by `gemini-2.0-flash` via the existing `gemini-client` infrastructure
- hint quota is enforced per problem per user based on subscription plan tier
- `ai_hint_usage` is read and written exclusively through `modules/ai-tutor/repositories/`
- `ai_hint_requested` event is emitted after every successful hint generation
- the billing module's `checkFeatureAccess()` gates AI hints for free-tier users
- `generateHintAction` uses Next.js 16 Server Actions with `useActionState` on the client
- no route handler, server component, or client component imports `gemini-client` or `lib/supabase/*` directly
- all Phase 8 tests pass under both `vitest run` and the integration test config
- the MVP scope (Phases 0–8) is now complete
