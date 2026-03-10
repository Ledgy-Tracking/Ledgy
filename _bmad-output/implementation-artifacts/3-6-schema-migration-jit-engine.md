# Story 3.6: Schema Migration JIT Engine

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer building on the ledgy data layer,
I want older ledger entries to be automatically migrated to the current schema structure when they are read,
so that schema evolution (adding or removing fields) does not break existing entries or require manual migration scripts.

## Acceptance Criteria

1. A pure function `migrateEntryData(entry, schema)` is exported from `src/lib/migration.ts`
2. It returns `{ migrated: LedgerEntry; didMigrate: boolean }`
3. When `entry.schema_version >= schema.schema_version`, no migration occurs — original entry is returned unchanged with `didMigrate: false`
4. When migration is required, keys in `entry.data` that are **not** present in `schema.fields` (by name) are stripped (removed-field cleanup)
5. Keys in `entry.data` that **are** present in `schema.fields` retain their existing values unchanged
6. The migrated entry has `schema_version` set to `schema.schema_version`
7. `list_entries` applies JIT migration to every returned entry before returning
8. `list_all_entries` applies JIT migration to every returned entry before returning
9. When `didMigrate === true`, the migrated entry is written back to PouchDB via `db.updateDocument`; if an `encryptionKey` is present, `data` is re-encrypted into `data_enc` and `data` is cleared before write-back
10. Migration write-back failure is **non-fatal**: logged as `console.warn` and the migrated (in-memory) entry is still returned to the caller
11. ≥ 6 new tests in `tests/schemaMigration.test.ts` covering the cases listed in Task 5
12. Zero TypeScript errors: `npx tsc --noEmit`
13. All existing tests remain unbroken

## Tasks / Subtasks

- [ ] Task 1 — Create `src/lib/migration.ts` pure function (AC: #1–#6)
  - [ ] Export `migrateEntryData(entry: LedgerEntry, schema: LedgerSchema): { migrated: LedgerEntry; didMigrate: boolean }`
  - [ ] Short-circuit guard: `if (entry.schema_version >= schema.schema_version)` → `return { migrated: entry, didMigrate: false }`
  - [ ] Build `newData: Record<string, unknown>`: iterate `Object.keys(entry.data)`, include key only if it appears in `schema.fields.map(f => f.name)`
  - [ ] Return `{ migrated: { ...entry, data: newData, schema_version: schema.schema_version }, didMigrate: true }`
  - [ ] **No database calls** — this is a pure, synchronous function
  - [ ] File: `src/lib/migration.ts`

- [ ] Task 2 — Add migration write-back helper inside `src/lib/db.ts` (AC: #9, #10)
  - [ ] Add non-exported async function `persistMigratedEntry(db: Database, entry: LedgerEntry, newSchemaVersion: number, encryptionKey?: CryptoKey): Promise<void>`
  - [ ] If `encryptionKey` is present: call `encryptPayload(encryptionKey, JSON.stringify(entry.data))`, then `db.updateDocument(entry._id, { data_enc: { iv: result.iv, ciphertext: Array.from(new Uint8Array(result.ciphertext)) }, data: {}, schema_version: newSchemaVersion })`
  - [ ] If no `encryptionKey`: `db.updateDocument(entry._id, { data: entry.data, schema_version: newSchemaVersion })`
  - [ ] Wrap entire function body in `try { ... } catch (error) { console.warn('Migration write-back failed for entry', entry._id, error); }` — **do NOT rethrow**
  - [ ] File: `src/lib/db.ts`

- [ ] Task 3 — Integrate migration into `list_entries` (AC: #7, #9)
  - [ ] After the decrypt step (just before `return`), add: `const schema = await get_schema(db, ledgerId).catch(() => null);`
  - [ ] If `schema` is null (schema deleted/not found): return entries as-is (skip migration entirely)
  - [ ] For each entry in the filtered + decrypted array: `const { migrated, didMigrate } = migrateEntryData(entry, schema);`
  - [ ] If `didMigrate`: call `await persistMigratedEntry(db, migrated, schema.schema_version, encryptionKey);` (write-back is non-fatal per Task 2)
  - [ ] Collect `migrated` entries into the return array
  - [ ] File: `src/lib/db.ts`

- [ ] Task 4 — Integrate migration into `list_all_entries` (AC: #8, #9)
  - [ ] Apply the exact same pattern as Task 3
  - [ ] File: `src/lib/db.ts`

- [ ] Task 5 — Add migration unit and integration tests (AC: #11)
  - [ ] `migrateEntryData` — same `schema_version`: no migration, returns `didMigrate: false` and identical `entry` reference
  - [ ] `migrateEntryData` — removed field: stale key stripped from `migrated.data`
  - [ ] `migrateEntryData` — added field (schema has new field, entry doesn't): key is simply absent from `migrated.data` (no default injection)
  - [ ] `migrateEntryData` — `schema_version` bumped: `migrated.schema_version === schema.schema_version`
  - [ ] `migrateEntryData` — mixed: multiple stale keys stripped, kept keys preserve values
  - [ ] Integration: `list_entries` returns entries with stale field stripped after schema update via `update_schema`
  - [ ] Integration (write-back): after `list_entries`, a subsequent `get_entry` on the same entry shows the updated `schema_version`
  - [ ] File: `tests/schemaMigration.test.ts`

- [ ] Task 6 — TypeScript and regression check (AC: #12, #13)
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] `npx vitest run` → 21 pre-existing failures (crypto mock / jsdom / ReactFlow — consistent baseline from Story 3-5), all new migration tests pass

## Dev Notes

### Overview: What the JIT Migration Engine Does

`update_schema` increments `schema_version` on the schema document every time the schema is modified. Existing entries retain their old `schema_version`. The JIT engine transparently upgrades stale entries on read — stripping removed fields and bumping the stored version — so the Data Lab (Stories 3-7 through 3-12) never sees stale data structures.

### `migrateEntryData` — Algorithm Detail

```typescript
// src/lib/migration.ts
import type { LedgerEntry } from '../types/ledger';
import type { LedgerSchema } from '../types/ledger';

export function migrateEntryData(
  entry: LedgerEntry,
  schema: LedgerSchema
): { migrated: LedgerEntry; didMigrate: boolean } {
  if (entry.schema_version >= schema.schema_version) {
    return { migrated: entry, didMigrate: false };
  }

  const activeFieldNames = new Set(schema.fields.map(f => f.name));
  const newData: Record<string, unknown> = {};
  for (const key of Object.keys(entry.data)) {
    if (activeFieldNames.has(key)) {
      newData[key] = entry.data[key];
    }
  }

  return {
    migrated: { ...entry, data: newData, schema_version: schema.schema_version },
    didMigrate: true,
  };
}
```

- **No default injection**: fields added to the schema are simply absent from `newData`. This is intentional — optional fields pass Zod validation when absent; required fields will fail validation on next write (by design, to prompt the user to fill them in).
- **`schema_version` bump**: the returned entry's `schema_version` matches the current schema — ensures write-back makes it current.

### Integrating Migration into `list_entries` — Correct Position

Migration must happen **after** decryption (so `entry.data` is populated with plaintext). The current structure of `list_entries` is:

```typescript
export async function list_entries(db, ledgerId, encryptionKey?) {
  const entryDocs = await db.getAllDocuments<LedgerEntry>('entry');
  const filtered = entryDocs.filter(doc => !doc.isDeleted && doc.ledgerId === ledgerId);
  return encryptionKey ? await decryptLedgerEntries(filtered, encryptionKey) : filtered;
  // ↑ ADD MIGRATION HERE, after this line resolves
}
```

Refactor to:
```typescript
const decrypted = encryptionKey ? await decryptLedgerEntries(filtered, encryptionKey) : filtered;
const schema = await get_schema(db, ledgerId).catch(() => null);
if (!schema) return decrypted;  // schema deleted — skip migration
const result: LedgerEntry[] = [];
for (const entry of decrypted) {
  const { migrated, didMigrate } = migrateEntryData(entry, schema);
  if (didMigrate) await persistMigratedEntry(db, migrated, schema.schema_version, encryptionKey);
  result.push(migrated);
}
return result;
```

> ⚠️ **ledgerId === schemaId assumption**: Per the project's architecture and `create_entry` usage pattern, `ledgerId` and `schemaId` are always the same value. `get_schema(db, ledgerId)` is therefore valid. Do NOT change this assumption — it is the established contract.

### `persistMigratedEntry` — Encryption Write-Back Pattern

This follows the exact same pattern as `update_entry` in `db.ts`:

```typescript
async function persistMigratedEntry(
  db: Database,
  entry: LedgerEntry,
  newSchemaVersion: number,
  encryptionKey?: CryptoKey
): Promise<void> {
  try {
    if (encryptionKey) {
      const result = await encryptPayload(encryptionKey, JSON.stringify(entry.data));
      await db.updateDocument(entry._id, {
        data_enc: { iv: result.iv, ciphertext: Array.from(new Uint8Array(result.ciphertext)) },
        data: {},
        schema_version: newSchemaVersion,
      });
    } else {
      await db.updateDocument(entry._id, { data: entry.data, schema_version: newSchemaVersion });
    }
  } catch (error) {
    console.warn('Migration write-back failed for entry', entry._id, error);
  }
}
```

The write-back is non-fatal by design: if PouchDB is temporarily unavailable (e.g., during sync conflict), the migrated entry is still returned in memory — the next read will just trigger migration again.

### Import Path in `db.ts`

Add to `db.ts` at the top of the ledger section (near line 424):
```typescript
import { migrateEntryData } from './migration';
```

No circular dependency risk — `migration.ts` imports types only (`LedgerEntry`, `LedgerSchema`), not from `db.ts`.

### Import Path in `migration.ts`

```typescript
import type { LedgerEntry } from '../types/ledger';
import type { LedgerSchema } from '../types/ledger';
```

No runtime imports — types only. This is intentional for the pure function pattern.

### Test File Pattern (Mirror `documentAdapters.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import PouchDB from 'pouchdb';
import { getProfileDb, _clearProfileDatabases, create_schema, update_schema, create_entry, get_entry, list_entries } from '../src/lib/db';
import { migrateEntryData } from '../src/lib/migration';
import type { LedgerSchema, LedgerEntry } from '../src/types/ledger';

const TEST_PROFILE_ID = 'migration-test';
const TEST_PROFILE_DB_NAME = `ledgy_profile_${TEST_PROFILE_ID}`;

async function freshDb() {
  const raw = new PouchDB(TEST_PROFILE_DB_NAME);
  await raw.destroy();
  _clearProfileDatabases();
  return getProfileDb(TEST_PROFILE_ID);
}

afterAll(async () => {
  try { await new PouchDB(TEST_PROFILE_DB_NAME).destroy(); } catch {}
  _clearProfileDatabases();
});
```

Use `freshDb()` per test to guarantee isolation. Follow the same `describe` → `it` nesting used in `documentAdapters.test.ts`.

### Unit Test: `migrateEntryData` Fixtures

Build minimal `LedgerSchema` and `LedgerEntry` fixtures inline (no mock library):

```typescript
function makeSchema(fields: string[], version = 2): LedgerSchema {
  return {
    _id: 'schema:test-id',
    type: 'schema',
    schema_version: version,
    name: 'Test',
    fields: fields.map(name => ({ name, type: 'text' as const })),
    profileId: 'p1',
    projectId: 'proj1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeEntry(data: Record<string, unknown>, version = 1): LedgerEntry {
  return {
    _id: 'entry:test-id',
    type: 'entry',
    schema_version: version,
    schemaId: 'schema:test-id',
    ledgerId: 'schema:test-id',
    data,
    profileId: 'p1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
```

### Pre-existing Test Baseline

From Story 3-5 completion:
- **Files:** 62 test files
- **Pre-existing failures:** 21 (crypto mock / jsdom / ReactFlow — unchanged)
- **Passing:** 530

This story adds ≥ 7 new tests (≥ 5 unit + ≥ 2 integration). New tests must all pass.

### Files to Touch

| File | Change |
|---|---|
| `src/lib/migration.ts` | **NEW** — pure `migrateEntryData` function |
| `src/lib/db.ts` | Add `persistMigratedEntry` helper; integrate migration into `list_entries` and `list_all_entries` |
| `tests/schemaMigration.test.ts` | **NEW** — ≥ 7 tests (5 unit + 2 integration) |

### Files to NOT Touch

- `src/lib/validation.ts` — migration is a structural concern, not a validation concern
- `src/stores/useLedgerStore.ts` — no changes needed; the migration is transparent at the db layer
- `src/features/ledger/useLedgerStore.ts` — do NOT touch (separate feature-local store)
- `src/types/ledger.ts` — no new fields needed on `LedgerEntry` or `LedgerSchema`
- `src/stores/useSchemaBuilderStore.ts` — out of scope

### Do NOT Introduce

- Default value injection for newly-added fields (not specified in story; defer to future validation/entry-edit flow)
- Field rename tracking (PouchDB has no rename concept; fields are added/removed only)
- Any UI changes (this is a pure data-layer story)
- Any new Zustand store

### Carry-Forward Review Items from Story 3-5

The following AI review findings from 3-5 are not fixed in this story but should remain visible for future implementation:

- `[AI-Review][LOW]` `key={index}` used as React key on reorderable field rows in `SchemaBuilder.tsx` — should use stable ID to prevent stale state after reorder
- `[AI-Review][LOW]` `DialogTitle` and submit button hardcoded to "Create" — should derive from store `mode` when edit mode is activated
- `[AI-Review][LOW]` Stories 3.x committed directly to `main` branch — project-context rule requires epic branch `epic/epic-3`; dev agent MUST create and use this branch
- `[AI-Review][MEDIUM]` `Date.parse` timezone sensitivity in `buildZodSchemaFromLedger` — boundary comparisons can silently fail for non-UTC users; consider normalising to UTC

### Branch Requirement

Per `project-context.md`: "When starting work on an epic, you MUST create a new git branch for that epic (e.g., `epic/epic-{{epic_num}}`). Multiple stories within the same epic should be implemented and committed to this epic branch."

Epic 3 is in-progress. Dev agent MUST check whether branch `epic/epic-3` exists and create it if not, before making any commits.

### References

- `schema_version` field definition: [Source: src/types/profile.ts — `LedgyDocument.schema_version: number`]
- `update_schema` increments version: [Source: src/lib/db.ts#L483 — `schema_version: schema.schema_version + 1`]
- `updateDocument` allows `schema_version` mutation: [Source: src/lib/db.ts#L122 — comment: "NFR9 JIT migration"]
- `list_entries` / `list_all_entries` current structure: [Source: src/lib/db.ts#L657–L683]
- `get_schema` function: [Source: src/lib/db.ts#L549–L555]
- Encryption pattern (re-encrypt on update): [Source: src/lib/db.ts#L625–L648 — `update_entry`]
- `_clearProfileDatabases` and test isolation pattern: [Source: tests/documentAdapters.test.ts]
- Architecture decision (schema evolution via `schema_version`): [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- `ledgerId === schemaId` contract: [Source: src/lib/db.ts#L580–L616 — `create_entry` parameters]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
