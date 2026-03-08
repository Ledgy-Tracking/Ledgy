# Story 3.1: PouchDB Document Adapters

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer building the Relational Ledger Engine,
I want strict, typed PouchDB document adapters for every ledger document type,
so that all entry, schema, and related documents are always created with the enforced `{type}:{uuid}` ID scheme, mandatory ISO 8601 date stamping, and consistent envelope fields — preventing malformed writes from ever reaching the database.

## Acceptance Criteria

1. **ID Scheme Enforcement:** Every document written to PouchDB by the ledger adapters must have `_id` matching the regex `/^(entry|schema|project|canvas):[0-9a-f-]{36}$/`. Writing a document with a manually crafted non-UUID ID (e.g., `entry:123`) is rejected at the adapter layer with a descriptive error.

2. **Envelope Field Completeness:** Every document created through the adapters must contain: `_id`, `type`, `schema_version` (integer ≥ 1), `createdAt` (ISO 8601 string), `updatedAt` (ISO 8601 string). Absence of any of these fields causes a thrown error.

3. **Reserved Field Rejection:** Calling any adapter function with a payload containing a field whose name starts with `_` (other than `_id`, `_rev`, `_deleted`) must throw with the message matching `reserved for PouchDB internal use`. This is already present in `validateDocumentFields()` in `src/lib/db.ts` — verify it is correctly called for all write paths.

4. **`get_entry` adapter exists:** A `get_entry(db, entryId)` function is exported from `src/lib/db.ts` (currently missing — only `getDocument<T>` exists generically). It must return the full `LedgerEntry` and throw a descriptive error (not a raw PouchDB 404) when the entry does not exist.

5. **`useLedgerStore` wired to PouchDB:** All `loadEntries`, `loadSchemas`, `createEntry`, `updateEntry`, `deleteEntry`, and `createSchema` actions in `src/features/ledger/useLedgerStore.ts` must be wired to the actual PouchDB adapter functions in `src/lib/db.ts`, replacing all `localStorage` mock implementations. The TODO comments citing "Story 1.5" must be removed.

6. **`useLedgerStore` requires active profile:** The store actions must source the profile database from `getProfileDb(activeProfileId)`. If `activeProfileId` is null/undefined, the action must dispatch an error via `useErrorStore` with the message "No active profile selected" and not throw uncaught.

7. **`schema_version` field consistency resolved:** The `LedgyDocument` TypeScript interface in `src/types/profile.ts` currently declares `schemaVersion` (camelCase), but `createDocument()` in `src/lib/db.ts` stores `schema_version` (snake_case) at runtime. These must be reconciled: the stored field name and the interface field name must match. Use `schema_version` (snake_case) to match the architecture document and existing tests.

8. **Tests in `/tests` directory:** All new test files must be placed in `/tests` at the project root (per `docs/project-context.md` non-negotiable rule). A new test file `tests/documentAdapters.test.ts` must exist and pass, covering:
   - AC 1: ID format validation
   - AC 2: Envelope fields present on create
   - AC 3: Reserved field rejection
   - AC 4: `get_entry` success and 404 cases
   - AC 5: Entry and schema CRUD through the store (mocked PouchDB via `vi.mock`)

9. **Zero TypeScript errors:** Running `npx tsc --noEmit` after all changes must report 0 errors.

10. **Existing tests unbroken:** All tests in `/tests` and `src/**/*.test.*` must continue to pass after changes.

## Tasks / Subtasks

- [ ] Task 1: Resolve `schema_version` / `schemaVersion` field name discrepancy (AC: #7)
  - [ ] 1.1 Update `LedgyDocument` in `src/types/profile.ts`: rename `schemaVersion` → `schema_version`
  - [ ] 1.2 Search-and-replace all TypeScript references that used `schemaVersion` (use `grep -r "schemaVersion" src/`) and update to `schema_version`
  - [ ] 1.3 Verify `updateDocument` in `src/lib/db.ts` correctly preserves `schema_version` when updating (it currently destructures `schema_version` in the data param but does NOT bump it — confirm this is correct for entries; schemas use explicit `update_schema` which bumps manually)
  - [ ] 1.4 Run `npx tsc --noEmit` to confirm zero TS errors

- [ ] Task 2: Add missing `get_entry` adapter function (AC: #4)
  - [ ] 2.1 In `src/lib/db.ts`, add `get_entry(db: Database, entryId: string): Promise<LedgerEntry>` near the other entry functions (~line 550)
  - [ ] 2.2 The function must call `db.getDocument<LedgerEntry>(entryId)` and throw `Error('Entry not found: ${entryId}')` on 404 rather than returning `null`

- [ ] Task 3: Wire `useLedgerStore` to PouchDB (AC: #5, #6)
  - [ ] 3.1 In `src/features/ledger/useLedgerStore.ts`, add a helper to get the active profile DB: use `useProfileStore.getState().activeProfileId` and call `getProfileDb(activeProfileId)`. Dispatch `useErrorStore` error if no active profile.
  - [ ] 3.2 Replace `loadEntries` localStorage mock with `list_entries(db, schemaId)` from `src/lib/db.ts`. If `schemaType` param is provided it maps to `ledgerId` for filtering.
  - [ ] 3.3 Replace `loadSchemas` localStorage mock with `list_schemas(db)` from `src/lib/db.ts`
  - [ ] 3.4 Replace `createEntry` localStorage mock with `create_entry(db, schemaId, ledgerId, data, profileId)` from `src/lib/db.ts`. Map store params appropriately.
  - [ ] 3.5 Replace `updateEntry` localStorage mock with `update_entry(db, entryId, data)` from `src/lib/db.ts`
  - [ ] 3.6 Replace `deleteEntry` localStorage mock with `delete_entry(db, entryId)` from `src/lib/db.ts` (soft-delete — matches ghost reference pattern)
  - [ ] 3.7 Replace `createSchema` localStorage mock with `create_schema(db, name, fields, profileId, projectId)` from `src/lib/db.ts`
  - [ ] 3.8 Update the store's `LedgerEntry` and `Schema` interfaces to extend the canonical types from `src/types/ledger.ts` and `src/types/profile.ts` — avoid duplicate interface definitions

- [ ] Task 4: Verify `validateDocumentFields` is called on all write paths (AC: #3)
  - [ ] 4.1 Confirm `validateDocumentFields()` in `db.ts` is called inside `createDocument()` ✓ (already is, verify it's not bypassed by any adapter function that calls `db.db.put()` directly)
  - [ ] 4.2 Verify `updateDocument()` also passes new data through validation before merging — if not, add the validation call

- [ ] Task 5: Write tests in `/tests/documentAdapters.test.ts` (AC: #8)
  - [ ] 5.1 Test: `createDocument('entry', {...})` produces `_id` matching `/^entry:[0-9a-f-]{36}$/`
  - [ ] 5.2 Test: Created document contains `schema_version`, `createdAt`, `updatedAt`, `type` fields
  - [ ] 5.3 Test: `createDocument` with `{ _secret: 'x' }` throws `reserved for PouchDB internal use`
  - [ ] 5.4 Test: `get_entry` returns entry when found
  - [ ] 5.5 Test: `get_entry` throws descriptive error (not raw 404) when entry does not exist
  - [ ] 5.6 Test: `create_schema` followed by `get_schema` returns the created schema with correct envelope fields
  - [ ] 5.7 Test: `delete_entry` soft-deletes (sets `isDeleted: true`) and `list_entries` excludes soft-deleted by default
  - [ ] 5.8 Test: `restore_entry` re-includes entry in `list_entries`

- [ ] Task 6: Final validation (AC: #9, #10)
  - [ ] 6.1 Run `npx tsc --noEmit` — must report 0 errors
  - [ ] 6.2 Run `npx vitest run` — all tests pass

## Dev Notes

### ⚠️ Critical Pre-Work: Verify Epic 2 Unresolved Discrepancies

The Epic 2 retrospective flagged two stories as having uncertain implementation status:

- **Story 2-3 (Profile Creation Flow):** sprint-status says `done`, story file says `ready-for-dev` with all tasks unchecked. Story 3-1 needs an active profile to operate. Before starting, run `grep -r "ProfileCreationForm\|ProfileCreationPage" src/` to confirm these components exist. If they do not, the `useLedgerStore` PouchDB integration (Task 3) cannot be manually tested via the UI — you will need to rely on unit tests only and flag this.

- **Story 2-6 (Cross-Profile Memory Sweeps):** Verify `key={activeProfileId}` remount pattern exists in `src/App.tsx` or the workspace root component. Run `grep -r "activeProfileId" src/App.tsx`. If absent, profile switching won't clear React state, which will cause data leaks between profiles. Story 3-1's `clearProfileData()` in `useLedgerStore` already exists (line ~199) — confirm it calls `set({ entries: [], schemas: [] })`.

### Existing DB Adapter Landscape (Do Not Reinvent)

`src/lib/db.ts` is the **only** data access layer. It is 870+ lines. Before writing any new adapter code, read this file completely. Key functions already exist:

| Function | Location | Notes |
|----------|----------|-------|
| `create_schema` | ~line 423 | ✓ Complete with encryption support |
| `update_schema` | ~line 463 | ✓ Increments schema version manually |
| `list_schemas` | ~line 495 | ✓ Filters `isDeleted`, decrypts if key provided |
| `get_schema` | ~line 538 | ✓ Simple getDocument wrapper |
| `delete_schema` | ~line 526 | ✓ Soft-delete (sets `isDeleted`) |
| `create_entry` | ~line 551 | ✓ Complete with encryption support |
| `update_entry` | ~line 593 | ✓ Complete |
| `list_entries` | ~line 621 | ✓ Filters by `ledgerId`, `isDeleted` |
| `list_all_entries` | ~line 639 | ✓ Includes soft-deleted (for Ghost Reference) |
| `find_entries_with_relation_to` | ~line 656 | ✓ For back-link detection (Story 3-13) |
| `delete_entry` | ~line 729 | ✓ Soft-delete |
| `restore_entry` | ~line 741 | ✓ Reverses soft-delete |
| `get_entry` | **MISSING** | ❌ Must be added (Task 2) |

### `schema_version` vs `schemaVersion` Discrepancy — Must Fix

This is the single biggest consistency issue. Currently:
- **`src/types/profile.ts` line 36:** `LedgyDocument.schemaVersion: number` (camelCase — WRONG)
- **`src/lib/db.ts` line 42:** `schema_version: 1` stored to PouchDB (snake_case — CORRECT per arch)
- **`src/lib/db.ts` line 113:** destructuring `const { ..., schema_version, ... } = data` (snake_case)
- **`src/lib/db.test.ts` line 66:** `expect(doc.schema_version).toBe(1)` (snake_case — CORRECT)

The fix: change `LedgyDocument.schemaVersion` → `LedgyDocument.schema_version` in `src/types/profile.ts`. Then `grep -r "\.schemaVersion\|schemaVersion:" src/` and update all references. The architecture doc explicitly shows `schema_version` in the document envelope.

### `useLedgerStore` Integration Pattern

The store needs to access the active profile's database. Pattern used by other stores:

```typescript
// Pattern from useProfileStore.ts — DO NOT use useProfileStore hook inside store
// (hooks can't be called outside React components)
// Instead, access store state directly:
import { useProfileStore } from '../profiles/useProfileStore';

// Inside an async action:
const activeProfileId = useProfileStore.getState().activeProfileId;
if (!activeProfileId) {
  useErrorStore.getState().dispatchError('No active profile selected', 'error');
  set({ isLoading: false });
  return;
}
const db = getProfileDb(activeProfileId);
```

Verify the field name `activeProfileId` exists in `useProfileStore` by checking `src/features/profiles/useProfileStore.ts` or `src/stores/useProfileStore.ts` (both appear to exist — check which is canonical).

### LedgerEntry Interface Duplication — Consolidate

`useLedgerStore.ts` defines its own local `LedgerEntry` and `Schema` interfaces (lines 3–38) that differ from `src/types/ledger.ts`. After wiring to PouchDB:
- Replace local `LedgerEntry` with import from `src/types/ledger.ts`
- Replace local `Schema` with `LedgerSchema` from `src/types/ledger.ts`
- The local `SchemaField` type can be replaced with the one from `src/types/ledger.ts` too

The local `SchemaField` includes `boolean` as a field type and has a `validation` object — check if these should be merged into `src/types/ledger.ts` or if the ledger.ts definition is the canonical one.

### ID Scheme — Already Enforced at Base Layer

The `{type}:{uuid}` ID enforcement is already implemented in `Database.createDocument()`:
```typescript
_id: `${type}:${uuidv4()}`,
```
Using the `uuid` package's `v4`. Do NOT implement a second layer of ID generation — just use `createDocument()` via the existing adapter functions.

### PouchDB Database Naming

Profile databases are named `ledgy_profile_{profileId}` (underscore separators, lowercase, no `ledgy-profile-` kebab variant). The `ProfileDbManager` uses kebab prefix `ledgy-profile-{id}` but the `Database` constructor uses `ledgy_profile_{profileId}`. This inconsistency is from prior stories — do NOT fix it in this story, just be aware the underlying `Database` class uses the underscore convention.

### Error Handling Pattern

All errors from PouchDB operations must be dispatched through `useErrorStore`:
```typescript
import { useErrorStore } from '../../stores/useErrorStore';
useErrorStore.getState().dispatchError(errorMessage, 'error');
```
No ad-hoc `console.error()` in store actions. No local `useState` for error state in the store (it already has `error: string | null` field).

### Testing Pattern for PouchDB in Vitest

PouchDB uses IndexedDB, which is not available in a jsdom environment. Use `pouchdb-adapter-memory` for tests:

```typescript
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
PouchDB.plugin(PouchDBMemoryAdapter);
// In db.ts Database constructor, the PouchDB name resolves to in-memory during tests
```

Alternatively, check how existing `src/lib/db.test.ts` sets up PouchDB — it creates real PouchDB instances and `destroy()`s them in `afterAll`. Replicate that pattern.

### `tests/` vs `src/` Test Location

The `docs/project-context.md` states (NON-NEGOTIABLE):
> **All test files MUST reside in the `/tests` directory** at the project root

However, Epic 1 and Epic 2 created many test files in `src/` (`src/lib/db.test.ts`, `src/lib/profileDbManager.test.ts`, etc.). These existing files must NOT be moved (doing so would break the test runner). For Story 3-1, **all new test files go into `/tests`** per the rule. Do not add any test files in `src/`.

### Project Structure Notes

- All new ledger service layer code stays in `src/lib/db.ts` (existing pattern) or `src/features/ledger/` for feature-specific logic
- New file: `tests/documentAdapters.test.ts` (unit tests for db.ts adapter functions)
- Modified files:
  - `src/types/profile.ts` (schema_version rename)
  - `src/lib/db.ts` (add get_entry, confirm validateDocumentFields coverage)
  - `src/features/ledger/useLedgerStore.ts` (replace localStorage with PouchDB)
  - Any file referencing `.schemaVersion` (TypeScript compilation will surface these)

### References

- Architecture document — document envelope format: [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- Architecture document — PouchDB document naming (`{type}:{uuid}`): [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- Architecture document — reserved underscore fields: [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- Architecture document — FR1-4 maps to `src/features/ledger/`: [Source: _bmad-output/planning-artifacts/architecture.md#FR to Directory Mapping]
- Project context — test file location rule (NON-NEGOTIABLE): [Source: docs/project-context.md#Testing Conventions]
- Project context — PouchDB underscore restriction: [Source: docs/project-context.md#Ledger]
- Epic 2 retro — dependency on 2-1 (solid), 2-6 (uncertain): [Source: _bmad-output/implementation-artifacts/epic-2-retro-2026-03-08.md#Epic 3 Preview]
- Existing base `Database` class: [Source: src/lib/db.ts lines 17-189]
- Existing entry adapter functions: [Source: src/lib/db.ts lines 551-734]
- `LedgyDocument` interface: [Source: src/types/profile.ts lines 31-40]
- `useLedgerStore` localStorage mocks (to be replaced): [Source: src/features/ledger/useLedgerStore.ts lines 66-197]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
