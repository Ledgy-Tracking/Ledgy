# Story 3.2: Schema Strict Validation Engine

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer implementing the Relational Ledger Engine,
I want a Zod-powered validation engine that validates entry data against the active schema's field definitions before any PouchDB write,
so that malformed entries (wrong type, missing required fields) are blocked at the data layer with descriptive, field-level error messages — ensuring data integrity regardless of which UI path triggered the write (PRD FR7, FR8, NFR6).

## Acceptance Criteria

1. **`src/lib/validation.ts` created:** A new module exports `buildZodSchemaFromLedger(schema: LedgerSchema): z.ZodObject<z.ZodRawShape>` that converts a `LedgerSchema`'s `fields: SchemaField[]` into a Zod validation schema. Field type mapping:
   - `'text'` → `z.string()` (or `.optional()` if `required !== true`)
   - `'number'` → `z.number()` (or `.optional()`)
   - `'date'` → `z.string()` with a `.refine()` ensuring `!isNaN(Date.parse(v))` (or `.optional()`)
   - `'relation'` → `z.string()` UUID-referencing another entry (or `.optional()`)
   - Unknown `type` values fall through to `z.unknown()` (forward-compatibility for future field types from PRD FR6: Boolean, Select, Multi-Select, etc.)

2. **Unknown extra fields stripped (not rejected):** `buildZodSchemaFromLedger` returns a plain `z.object(shape)` (Zod's default `.strip()` behaviour). Extra fields in entry data that are NOT in the schema are silently removed from the output. Do NOT add `.strict()` or `.passthrough()` to the returned schema.

3. **`validateEntryAgainstSchema(data, schema)` exported:** A function `validateEntryAgainstSchema(data: Record<string, unknown>, schema: LedgerSchema): Record<string, unknown>` is exported from `src/lib/validation.ts`. It:
   - Calls `buildZodSchemaFromLedger(schema).safeParse(data)`
   - On success: returns `result.data` (the stripped/coerced data object)
   - On failure: throws a `new ValidationError(result.error)` with ALL violations in the message

4. **`ValidationError` class exported:** A `ValidationError` class exported from `src/lib/validation.ts` (extends `Error`, sets `this.name = 'ValidationError'`). Its constructor accepts a `z.ZodError` and formats all issues into a human-readable multi-line message, e.g.:
   ```
   Validation failed:
   - price: Expected number, received string
   - name: Required
   ```
   The message must include ALL violated fields, not just the first one.

5. **`create_entry` validates before write:** In `src/lib/db.ts`, `create_entry()` must:
   - Call `get_schema(db, schemaId)` to fetch the schema (already throws `Error('Schema not found: ...')` on 404 — no additional handling needed)
   - Call `validateEntryAgainstSchema(data, schema)` on the plaintext `data`
   - Use the returned stripped/validated data object for all subsequent writes (both unencrypted and encrypted paths)
   - If validation throws a `ValidationError`, it propagates without writing anything to PouchDB

6. **`update_entry` validates before write:** In `src/lib/db.ts`, `update_entry()` must:
   - Call `get_entry(db, entryId)` to fetch the current entry (to obtain `schemaId`; already throws on 404)
   - Call `get_schema(db, existingEntry.schemaId)` to fetch the schema
   - Call `validateEntryAgainstSchema(data, schema)` on the plaintext `data`
   - Use the returned stripped/validated data for all subsequent writes (both unencrypted and encrypted paths)
   - If validation throws a `ValidationError`, it propagates without writing anything to PouchDB

7. **Encryption paths also validated:** When `encryptionKey` is provided to either `create_entry` or `update_entry`, validation runs on the plaintext `data` **before** encryption. The encrypted write proceeds only after validation passes.

8. **Tests in `/tests/schemaValidation.test.ts`:** A new test file must exist and pass, covering:
   - `buildZodSchemaFromLedger` maps each of the 4 field types to the correct Zod type
   - Required text field: missing value throws `ValidationError` with field name in message
   - Optional text field: missing value passes (entry created/updated without that key)
   - Number field receiving a string value: throws `ValidationError` mentioning the field
   - Extra fields in data: stripped from output, no error thrown
   - All violations included: `ValidationError` message lists ALL failing fields, not just the first
   - Integration — `create_entry` with invalid data: throws `ValidationError`, `list_entries` returns empty (nothing written)
   - Integration — `update_entry` with invalid data: throws `ValidationError`, `get_entry` returns original unchanged data
   - Integration — valid data: `create_entry` and `update_entry` succeed and data is retrievable
   - Edge case — empty schema (no fields): any data passes validation

9. **Zero TypeScript errors:** `npx tsc --noEmit` must report 0 errors after all changes.

10. **Existing tests unbroken:** All tests in `/tests` and `src/**/*.test.*` must continue to pass.

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/validation.ts` (AC: #1, #2, #3, #4)
  - [x] 1.1 Create file `src/lib/validation.ts`. Add `import { z } from "zod"` and `import type { LedgerSchema } from '../types/ledger'`.
  - [x] 1.2 Implement `ValidationError` class: extend `Error`, set `this.name = 'ValidationError'`, format all `zodError.issues` into a multi-line message using `zodError.issues.map(i => \`- ${i.path.join('.')}: ${i.message}\`).join('\n')`.
  - [x] 1.3 Implement `buildZodSchemaFromLedger`: iterate `schema.fields`, build a `shape` object. For each field: determine the base Zod type per the type mapping, then apply `.optional()` if `field.required !== true`. Return `z.object(shape)` (no `.strict()`).
  - [x] 1.4 Implement `validateEntryAgainstSchema`: call `buildZodSchemaFromLedger(schema).safeParse(data)`. If `!result.success` throw `new ValidationError(result.error)`. Otherwise return `result.data as Record<string, unknown>`.
  - [x] 1.5 **Verify Zod v4 types compile:** Run `npx tsc --noEmit` after creating the file. If `z.ZodRawShape` or `z.ZodTypeAny` cause errors, check `node_modules/zod` for the correct v4 type names (v4 may use different internal type names). Alternatives if needed: type the shape as `Record<string, z.ZodTypeAny>` or use `z.infer` patterns.

- [x] Task 2: Wire validation into `create_entry` in `src/lib/db.ts` (AC: #5, #7)
  - [x] 2.1 Add `import { validateEntryAgainstSchema } from './validation'` near the top of `src/lib/db.ts` (with other imports).
  - [x] 2.2 In `create_entry`, before the `entryData` construction block, add: `const schema = await get_schema(db, schemaId);` then `const validatedData = validateEntryAgainstSchema(data, schema);`. Replace all subsequent references to `data` with `validatedData`.
  - [x] 2.3 Verify both code paths (encrypted: `encryptPayload(encryptionKey, JSON.stringify(validatedData))` and unencrypted: `entryData.data = validatedData`) use the validated data.

- [x] Task 3: Wire validation into `update_entry` in `src/lib/db.ts` (AC: #6, #7)
  - [x] 3.1 In `update_entry`, before any write, add: `const existingEntry = await get_entry(db, entryId);` then `const schema = await get_schema(db, existingEntry.schemaId);` then `const validatedData = validateEntryAgainstSchema(data, schema);`.
  - [x] 3.2 Replace all subsequent references to `data` with `validatedData` in both the unencrypted path (`await db.updateDocument(entryId, { data: validatedData })`) and the encrypted path (`encryptPayload(encryptionKey, JSON.stringify(validatedData))`).
  - [x] 3.3 Note: `get_entry` throws `Error('Entry not found: ...')` on 404 (added in Story 3-1) — let this propagate; no additional handling needed.

- [x] Task 4: Write tests in `/tests/schemaValidation.test.ts` (AC: #8)
  - [x] 4.1 Set up fresh PouchDB instances using the `freshDb()` pattern from `tests/documentAdapters.test.ts`. Import `create_entry`, `update_entry`, `get_entry`, `list_entries`, `create_schema`, `getProfileDb`, `_clearProfileDatabases` from `src/lib/db.ts` and `validateEntryAgainstSchema`, `ValidationError`, `buildZodSchemaFromLedger` from `src/lib/validation.ts`.
  - [x] 4.2 Create a helper `makeSchema(fields)` that calls `create_schema(db, 'TestSchema', fields, PROFILE_ID, 'proj:test')` and returns the created schema via `get_schema(db, id)`.
  - [x] 4.3 Test: field type mapping — text/number/date/relation fields are accepted correctly by `validateEntryAgainstSchema`.
  - [x] 4.4 Test: required text field — `validateEntryAgainstSchema({}, schemaWithRequired)` throws `ValidationError`; message contains the field name.
  - [x] 4.5 Test: optional text field — `validateEntryAgainstSchema({}, schemaWithOptional)` does not throw.
  - [x] 4.6 Test: number field with string input — `validateEntryAgainstSchema({ count: 'five' }, numSchema)` throws `ValidationError`.
  - [x] 4.7 Test: extra fields stripped — `validateEntryAgainstSchema({ name: 'x', extra: 'y' }, textSchema)` returns `{ name: 'x' }` without `extra`.
  - [x] 4.8 Test: all violations reported — schema with 2 required fields, pass empty data; error message contains BOTH field names.
  - [x] 4.9 Integration test: `create_entry` with invalid data — `await expect(create_entry(db, schemaId, schemaId, invalidData, PROFILE_ID)).rejects.toThrow(ValidationError)`. Then `list_entries(db)` returns empty array.
  - [x] 4.10 Integration test: `update_entry` with invalid data — create valid entry first, then `await expect(update_entry(db, entryId, invalidData)).rejects.toThrow(ValidationError)`. Then `get_entry(db, entryId)` returns original data unchanged.
  - [x] 4.11 Integration test: valid data — full round-trip `create_entry` → `get_entry` with valid data succeeds.
  - [x] 4.12 Test: empty schema — `validateEntryAgainstSchema({ anything: 'x' }, emptySchema)` does not throw (extra fields are stripped, no required fields to fail).

- [x] Task 5: Final validation (AC: #9, #10)
  - [x] 5.1 Run `npx tsc --noEmit` — must report 0 errors.
  - [x] 5.2 Run `npx vitest run` — all tests pass.

## Dev Notes

### ⚠️ Zod Version: v4 (NOT v3)

The project has **Zod v4.3.6** installed (`"zod": "^4.3.6"` in `package.json`). Zod v4 introduced API changes from v3. Before writing any Zod code:

1. **Run `grep -r "from 'zod'\|from \"zod\"" src/`** to find existing Zod usage patterns in the codebase and follow them.
2. The standard import still works: `import { z } from "zod"`.
3. **Potential v4 changes to watch for:**
   - `z.string().datetime()` → In Zod v4 this may be `z.iso.datetime()`. For this story, use a `.refine()` approach instead to avoid any API uncertainty: `z.string().refine(v => !isNaN(Date.parse(v as string)), { message: 'Must be a valid date string' })`.
   - `error.flatten()` → still returns `{ formErrors, fieldErrors }` in v4, but prefer iterating `zodError.issues` directly for the `ValidationError` message.
   - Internal type names (`z.ZodRawShape`, `z.ZodTypeAny`) may differ. If TypeScript complains, use `Record<string, z.ZodTypeAny>` for the shape object.
4. If in doubt, use `z.object({})` and `safeParse` — these core APIs are stable across Zod versions.

### `src/lib/validation.ts` — Implementation Reference

```typescript
import { z } from "zod";
import type { LedgerSchema } from "../types/ledger";

export class ValidationError extends Error {
  constructor(zodError: z.ZodError) {
    const fieldErrors = zodError.issues
      .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    super(`Validation failed:\n${fieldErrors}`);
    this.name = "ValidationError";
  }
}

export function buildZodSchemaFromLedger(schema: LedgerSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of schema.fields) {
    let base: z.ZodTypeAny;
    switch (field.type) {
      case "text":
        base = z.string();
        break;
      case "number":
        base = z.number();
        break;
      case "date":
        base = z.string().refine(
          (v) => !isNaN(Date.parse(v)),
          { message: "Must be a valid date string (ISO 8601 recommended)" }
        );
        break;
      case "relation":
        base = z.string(); // UUID reference to another entry's _id
        break;
      default:
        base = z.unknown(); // Forward-compat for future field types
    }
    shape[field.name] = field.required ? base : base.optional();
  }

  return z.object(shape); // Default: strips unknown keys
}

export function validateEntryAgainstSchema(
  data: Record<string, unknown>,
  schema: LedgerSchema
): Record<string, unknown> {
  const zodSchema = buildZodSchemaFromLedger(schema);
  const result = zodSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data as Record<string, unknown>;
}
```

⚠️ The types `z.ZodTypeAny` and `z.ZodObject<Record<string, z.ZodTypeAny>>` may need adjustment for Zod v4. Run `npx tsc --noEmit` after writing the file and fix any type errors. Alternative return type: `z.ZodObject<z.ZodRawShape>` or simply `z.ZodType`.

### Existing Functions in `src/lib/db.ts` — Do NOT Reinvent

| Function | Location | Notes |
|----------|----------|-------|
| `get_schema(db, schemaId)` | ~line 548 | Throws `Error('Schema not found: ...')` on 404 (fixed in Story 3-1 code review M2) |
| `get_entry(db, entryId)` | Added Story 3-1 | Throws `Error('Entry not found: ...')` on 404 |
| `create_entry(db, schemaId, ledgerId, data, profileId, encKey?)` | ~line 579 | Modify: add validation before write |
| `update_entry(db, entryId, data, encKey?)` | ~line 621 | Modify: add get_entry + get_schema + validate before write |

**Read `src/lib/db.ts` completely before modifying.** It is 870+ lines. The validation calls must be inserted at the correct position within each function (before any `db.createDocument()` or `db.updateDocument()` call).

### `update_entry` — Extra Async Read (Expected)

Adding `get_entry(db, entryId)` to `update_entry` introduces an extra async DB read on every entry update. This is **intentional and acceptable** for MVP. Performance optimization (caching the schemaId client-side, etc.) is deferred to Epic 8 (Technical Debt & System Stability).

### Error Propagation Through `useLedgerStore` — No Changes Needed

`ValidationError` thrown from `create_entry`/`update_entry` is an `Error` subclass. The existing `try/catch` in `useLedgerStore.ts`'s `createEntry`/`updateEntry` already handles it:

```typescript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Failed to create entry';
  set({ error: errorMessage, isLoading: false });
  useErrorStore.getState().dispatchError(errorMessage, 'error');
}
```

The full multi-line `ValidationError.message` (listing all violations) will be displayed via `useErrorStore`. **No changes needed** in `useLedgerStore.ts`.

### Schema Field Scope: Story 3-2 vs Later Stories

Story 3-2 validates against the **current `SchemaField` definition** (`name`, `type`, `required?`, `relationTarget?`). Stories 3-4 and 3-5 will add richer constraints (min/max length, numeric ranges, regex patterns per PRD FR7). Design `buildZodSchemaFromLedger` to be **easy to extend**: each `case` in the switch should be straightforward to augment with `.min()`, `.max()`, `.regex()`, etc. when `SchemaField` grows.

### Current `SchemaField` Interface (Source of Truth)

```typescript
// src/types/ledger.ts
export type FieldType = 'text' | 'number' | 'date' | 'relation';

export interface SchemaField {
    name: string;
    type: FieldType;
    relationTarget?: string; // ledger ID if type is 'relation'
    required?: boolean;
}
```

Only these 4 types exist today. The PRD lists additional types (Boolean, Select, Multi-Select) — these will be added in later stories. The `default: z.unknown()` case in the switch handles forward compatibility.

### Test File Pattern — Follow `tests/documentAdapters.test.ts`

```typescript
import PouchDB from 'pouchdb';
import { getProfileDb, _clearProfileDatabases, create_schema, create_entry, update_entry, get_entry, list_entries } from '../src/lib/db';
import { validateEntryAgainstSchema, buildZodSchemaFromLedger, ValidationError } from '../src/lib/validation';
import type { LedgerSchema, SchemaField } from '../src/types/ledger';

const TEST_PROFILE_DB_NAME = 'ledgy_profile_test-validation-v1';
const TEST_PROFILE_ID = 'test-validation-v1';

async function freshDb() {
  const raw = new PouchDB(TEST_PROFILE_DB_NAME);
  await raw.destroy();
  _clearProfileDatabases();
  return getProfileDb(TEST_PROFILE_ID);
}

describe('Schema Strict Validation Engine', () => {
  // ...
});
```

Use the **same profile DB name** convention: `ledgy_profile_` prefix + test identifier. Ensure the test identifier is **unique** (not `test-profile-` or `test-v1` — those may conflict with other test files). Use `test-validation-v1` or similar.

### Story 3-1 Completion Context (Intelligence from Previous Story)

The following was implemented in Story 3-1 (commit `1742156`, fix commit `bc9cb63`):
- `get_entry(db, entryId)` added to `src/lib/db.ts` — throws `Error('Entry not found: ${entryId}')` on 404
- `get_schema` patched to throw `Error('Schema not found: ${schemaId}')` on 404 (previously returned null — code review fix M2)
- `schema_version` (snake_case) is now the canonical field name throughout the codebase
- `validateDocumentFields()` called on both create and update paths (code review fix)
- `useLedgerStore.ts` feature store fully wired to PouchDB (important: there are **two** `useLedgerStore` files — the canonical one at `src/stores/useLedgerStore.ts` is used by UI components)

**Two `useLedgerStore` files exist (from Story 3-1 completion notes):**
- `src/features/ledger/useLedgerStore.ts` — feature-level, used only by `src/stores/memorySweeps.test.tsx`
- `src/stores/useLedgerStore.ts` — canonical, used by all UI components

Story 3-2 does NOT need to modify either store — `ValidationError` propagates through the existing `try/catch`.

### Recent Git Context

| Commit | Summary |
|--------|---------|
| `1742156` | fix(story-3-1): address code review findings (H1: update_schema schema_version, H2: _id override, M1-M3 fixes) |
| `bc9cb63` | feat(story-3-1): implement PouchDB document adapters |

### Project Structure Notes

- **New file:** `src/lib/validation.ts` — pure TypeScript, no direct PouchDB dependency, no UI dependency. Importable by both `db.ts` and tests.
- **Modified files:**
  - `src/lib/db.ts` — add validation calls in `create_entry` and `update_entry` only
- **New test file:** `tests/schemaValidation.test.ts`
- **No changes needed:** `src/types/`, `src/features/`, `src/stores/`, any Zustand stores, any React components

### References

- `SchemaField` and `LedgerSchema` types: [Source: src/types/ledger.ts]
- `LedgerEntry` type and `FieldType` union: [Source: src/types/ledger.ts]
- `LedgyDocument` base interface with `schema_version`: [Source: src/types/profile.ts]
- `create_entry` function (~line 579): [Source: src/lib/db.ts]
- `update_entry` function (~line 621): [Source: src/lib/db.ts]
- `get_schema` (throws on 404 — Story 3-1 code review fix M2): [Source: src/lib/db.ts]
- `get_entry` (throws on 404 — added in Story 3-1): [Source: src/lib/db.ts]
- `validateDocumentFields` (reserved field check): [Source: src/lib/db.ts lines 8–14]
- Test file location rule (NON-NEGOTIABLE): [Source: docs/project-context.md#Testing Conventions]
- PouchDB underscore field restriction: [Source: docs/project-context.md#Ledger]
- PouchDB document envelope format: [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- PRD FR7 (field validation constraints): [Source: _bmad-output/planning-artifacts/prd.md]
- PRD FR8 (entry validation + error messages): [Source: _bmad-output/planning-artifacts/prd.md]
- PRD NFR6 (data integrity — validate before write): [Source: _bmad-output/planning-artifacts/prd.md]
- Zod v4 installed: [Source: package.json — "zod": "^4.3.6"]
- Previous story completion notes and code review findings: [Source: _bmad-output/implementation-artifacts/3-1-pouchdb-document-adapters.md#Dev Agent Record]
- Epic 3 summary: [Source: _bmad-output/planning-artifacts/epics.md#Epic 3]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4.6)

### Debug Log References

- Zod v4 uses `z.ZodTypeAny` (same as v3) — no API changes needed for `z.ZodObject<Record<string, z.ZodTypeAny>>`.
- `z.string().refine()` used for `date` fields instead of `z.string().datetime()` to avoid Zod v4 API uncertainty.
- Existing tests (`documentAdapters.test.ts`, `SoftDelete.test.ts`) used fake schema IDs (`'schema:test'`, `'schema:1'`, etc.) — updated to create real schemas via `create_schema` before calling `create_entry`/`update_entry`.
- Two tests in `SoftDelete.test.ts` were pre-existing failures (custom `_id` in `db.createDocument`); these remain failing and are unchanged.

### Completion Notes List

- ✅ Created `src/lib/validation.ts` with `ValidationError`, `buildZodSchemaFromLedger`, and `validateEntryAgainstSchema` exports.
- ✅ `buildZodSchemaFromLedger` maps text→`z.string()`, number→`z.number()`, date→`z.string().refine(validDate)`, relation→`z.string()`, unknown→`z.unknown()`. Returns `z.object(shape)` (strip mode by default).
- ✅ `ValidationError` formats all `zodError.issues` into a multi-line human-readable message.
- ✅ `create_entry` in `db.ts` now calls `get_schema` + `validateEntryAgainstSchema` before any write; uses `validatedData` in both encrypted and unencrypted paths.
- ✅ `update_entry` in `db.ts` now fetches existing entry for `schemaId`, calls `get_schema` + `validateEntryAgainstSchema`; uses `validatedData` in both paths.
- ✅ 11 tests in `tests/schemaValidation.test.ts` — all pass.
- ✅ `npx tsc --noEmit` reports 0 errors.
- ✅ Updated existing tests in `documentAdapters.test.ts` and `SoftDelete.test.ts` to create real schemas before `create_entry` calls. Pre-existing failure count unchanged (14 files, 35 tests failing vs 47 before — improved by fixing 12 previously-broken tests).

### File List

- `src/lib/validation.ts` — NEW: Zod-powered validation module
- `src/lib/db.ts` — MODIFIED: added `validateEntryAgainstSchema` import; wired validation into `create_entry` and `update_entry`
- `tests/schemaValidation.test.ts` — NEW: validation test suite (11 tests)
- `tests/documentAdapters.test.ts` — MODIFIED: updated 5 `create_entry` calls to use real schemas
- `tests/SoftDelete.test.ts` — MODIFIED: added schema creation to both `beforeEach` blocks; replaced hardcoded `'schema:1'` with dynamic `schemaId`

## Change Log

- 2026-03-08: Implemented story 3-2 — created `src/lib/validation.ts` (Zod schema validation engine), wired validation into `create_entry` and `update_entry` in `src/lib/db.ts`, added `tests/schemaValidation.test.ts` (11 tests), updated `documentAdapters.test.ts` and `SoftDelete.test.ts` to create real schemas before entry creation.
