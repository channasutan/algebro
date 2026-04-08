---

# types/

This directory contains auto-generated TypeScript types derived from the live
Supabase schema. **Do not edit `database.types.ts` manually** — any manual changes
will be overwritten on the next regeneration.

---

## Regenerating types locally

Ensure your Supabase Cloud project is **active** (free tier auto-pauses after ~7 days
of inactivity — resume at supabase.com/dashboard before running this).

```bash
# Extract project ref from .env.local and regenerate
PROJECT_REF=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local \
  | sed 's|.*https://\([^.]*\)\.supabase\.co.*|\1|')

npx supabase gen types typescript \
  --project-id "$PROJECT_REF" \
  > types/database.types.ts

# Verify output is non-empty
wc -l types/database.types.ts
```

---

## CI (CircleCI)

Types are regenerated automatically in CI before the type-check step.
`SUPABASE_PROJECT_REF` must be set as a CircleCI environment variable
(Project Settings → Environment Variables). Do not hardcode it in config.yml.

---

## Usage

All Supabase client factories in `lib/supabase/` are wired to this type:

```ts
import type { Database } from '@/types/database.types'
```

- `lib/supabase/browser-client.ts` → `createBrowserClient<Database>(...)`
- `lib/supabase/server-client.ts`  → `createServerClient<Database>(...)`
- `lib/supabase/admin-client.ts`   → `createClient<Database>(...)`

---

## Schema gaps

If a table or column is missing from `database.types.ts`, it means the migration
has not been applied to the live Supabase project yet. Apply the migration first,
then regenerate.

---
