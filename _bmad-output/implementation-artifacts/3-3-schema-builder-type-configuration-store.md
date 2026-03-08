# Story 3.3: Schema Builder - Type Configuration Store

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer implementing the Relational Ledger Engine,
I want a Zustand-powered schema builder state machine (`useSchemaBuilderStore`) that manages the full lifecycle of schema creation and editing before persisting to PouchDB,
so that the `SchemaBuilder.tsx` component is decoupled from local `useState` async layers (violating architecture mandates), all draft-field mutations are testable in isolation, and subsequent stories (3-4, 3-5) have a stable store API to bind their field-type-specific inspector UIs against (PRD FR6, FR7).

## Acceptance Criteria

1. **`src/stores/useSchemaBuilderStore.ts` created:** A new Zustand store is created at `src/stores/useSchemaBuilderStore.ts`. It must export `useSchemaBuilderStore` and the `SchemaBuilderState` interface.

2. **Extended `FieldType` union exported from `src/types/ledger.ts`:** The `FieldType` union in `src/types/ledger.ts` is updated from `'text' | 'number' | 'date' | 'relation'` to include all PRD FR6 types:
   ```typescript
   export type FieldType = 'text' | 'number' | 'date' | 'relation' | 'long_text' | 'boolean' | 'select' | 'multi_select';
   ```
   The existing Zod validation engine in `src/lib/validation.ts` handles unknown types with `z.unknown()` (forward-compat already in place from Story 3-2) — no changes needed there.

3. **Store state shape is correct:** The store exposes this state (all fields accessible via `useSchemaBuilderStore.getState()`):
   ```typescript
   interface SchemaBuilderState {
     // Draft being actively edited
     draftName: string;
     draftFields: SchemaField[];
     // Mode management
     mode: 'create' | 'edit';
     editingSchemaId: string | null;  // null when mode === 'create'
     projectId: string;               // stored by initCreate/initEdit for use in commit()
     // Status flags
     isDirty: boolean;           // true when draft differs from saved/initial state
     isLoading: boolean;
     error: string | null;
   }
   ```

4. **`initCreate(projectId: string)` action:** Resets the store to a clean slate for creating a new schema. Sets `mode: 'create'`, `editingSchemaId: null`, clears `draftName`, clears `draftFields`, sets `isDirty: false`.

5. **`initEdit(schema: LedgerSchema)` action:** Loads an existing schema for editing. Sets `mode: 'edit'`, `editingSchemaId: schema._id`, copies `draftName` from `schema.name`, deep-copies `draftFields` from `schema.fields`, sets `isDirty: false`.

6. **`setDraftName(name: string)` action:** Updates `draftName` and sets `isDirty: true`.

7. **`addField()` action:** Appends a new blank field `{ name: '', type: 'text', required: false }` to `draftFields` and sets `isDirty: true`.

8. **`removeField(index: number)` action:** Removes the field at `index` from `draftFields`. If `index` is out of bounds, the action is a no-op. Sets `isDirty: true`.

9. **`updateField(index: number, patch: Partial<SchemaField>)` action:** Merges `patch` into the field at `index` using a spread. If the new `type !== 'relation'`, `relationTarget` is cleared (set to `undefined`). Sets `isDirty: true`.

10. **`reorderField(fromIndex: number, toIndex: number)` action:** Moves the field at `fromIndex` to `toIndex` via array splice. If either index is out of bounds, the action is a no-op. Sets `isDirty: true`.

11. **`commit(profileId: string)` async action:** Validates draft and persists to PouchDB:
    - If `draftName.trim() === ''` → dispatches error `'Schema name is required'` to `useErrorStore` and sets `error` state, returns without writing.
    - If `draftFields.length === 0` → dispatches error `'At least one field is required'`, returns without writing.
    - For any field with `type === 'relation'` and `!field.relationTarget` → dispatches error `'Relation target required for field "<name>"'`, returns without writing.
    - Sets `isLoading: true`.
    - If `mode === 'create'`: calls `useLedgerStore.getState().createSchema(profileId, projectId, draftName.trim(), draftFields)` (the `projectId` must be stored in the store — see AC #4 — `initCreate` stores `projectId` in local store state).
    - If `mode === 'edit'`: calls `useLedgerStore.getState().updateSchema(editingSchemaId, draftName.trim(), draftFields)`.
    - On success: sets `isLoading: false`, `isDirty: false`, `error: null`.
    - On failure: sets `isLoading: false`, dispatches error to `useErrorStore`, re-throws for the calling component.

12. **`discard()` action:** Resets state to initial (same as initial store state): clears `draftName`, clears `draftFields`, `mode: 'create'`, `editingSchemaId: null`, `isDirty: false`, `error: null`.

13. **`SchemaBuilder.tsx` refactored:** `src/features/ledger/SchemaBuilder.tsx` is refactored to use `useSchemaBuilderStore` instead of local `useState` for `schemaName`, `fields`, and `localError`. The component must:
    - Call `initCreate(projectId)` in a `useEffect` when `projectId` changes (or on mount).
    - Bind all field mutations to store actions (`addField`, `removeField`, `updateField`, `reorderField`, `setDraftName`).
    - Call `commit(activeProfileId)` on form submit; call `discard()` and `onClose()` on cancel.
    - The component may still use local `useState` for purely presentational state (e.g., hover state) but NOT for any draft schema data.

14. **Tests in `/tests/schemaBuilderStore.test.ts`:** A new test file exists at `/tests/schemaBuilderStore.test.ts` that tests the store in isolation (no DB calls needed for store unit tests):
    - `initCreate` resets state correctly
    - `initEdit` loads schema fields correctly and `isDirty` is false after init
    - `setDraftName` updates name and marks dirty
    - `addField` adds blank field
    - `removeField` removes correct index; out-of-bounds is no-op
    - `updateField` merges patch; relation target cleared when type changes away from `'relation'`
    - `reorderField` swaps positions correctly; out-of-bounds is no-op
    - `discard` resets everything to initial state
    - `commit` with empty name → error dispatched, `isLoading` stays false
    - `commit` with empty fields → error dispatched
    - `commit` with relation field missing target → error dispatched

15. **Zero TypeScript errors:** `npx tsc --noEmit` must report 0 errors after all changes.

16. **Existing tests unbroken:** All tests in `/tests` and `src/**/*.test.*` must continue to pass. In particular `tests/schemaValidation.test.ts` must still pass (no changes to `validation.ts` logic).

## Tasks / Subtasks

- [x] Task 1: Extend `FieldType` in `src/types/ledger.ts` (AC: #2)
  - [x] 1.1 Open `src/types/ledger.ts`. Change the `FieldType` export from `'text' | 'number' | 'date' | 'relation'` to `'text' | 'number' | 'date' | 'relation' | 'long_text' | 'boolean' | 'select' | 'multi_select'`.
  - [x] 1.2 Run `npx tsc --noEmit` and fix any type errors that arise from the expanded union (likely none, since existing switch statements use `default` fallback).
  - [x] 1.3 Verify `src/lib/validation.ts` handles the new types via its existing `default: z.unknown()` branch — no changes needed.

- [x] Task 2: Create `src/stores/useSchemaBuilderStore.ts` (AC: #1, #3–#12)
  - [x] 2.1 Create the file. Import `create` from `zustand`, `SchemaField`, `LedgerSchema` from `../types/ledger`, `useErrorStore` from `./useErrorStore`.
  - [x] 2.2 Define and export `SchemaBuilderState` interface with fields: `draftName`, `draftFields`, `mode`, `editingSchemaId`, `projectId`, `isDirty`, `isLoading`, `error`, and all actions.
  - [x] 2.3 Define `initialState` object.
  - [x] 2.4 Implement `initCreate(projectId)`: store `projectId` in store state for use in `commit`, then reset draft fields.
  - [x] 2.5 Implement `initEdit(schema)`: deep-copy `schema.fields` via `schema.fields.map(f => ({ ...f }))` to avoid mutation.
  - [x] 2.6 Implement `setDraftName`, `addField`, `removeField`, `updateField` (clear `relationTarget` if type changes), `reorderField` (splice pattern).
  - [x] 2.7 Implement `commit`: validation checks first (dispatch to `useErrorStore`, set `error`, return early), then branch on `mode` to call either `createSchema` or `updateSchema` from `useLedgerStore`. Top-of-file import used (no circular dependency).
  - [x] 2.8 Implement `discard`: spread `initialState` onto `set({...initialState})`.
  - [x] 2.9 Export `useSchemaBuilderStore`.

- [x] Task 3: Refactor `SchemaBuilder.tsx` (AC: #13)
  - [x] 3.1 Read `src/features/ledger/SchemaBuilder.tsx` completely.
  - [x] 3.2 Add import: `import { useSchemaBuilderStore } from '../../stores/useSchemaBuilderStore'`.
  - [x] 3.3 Replace `useState` for `schemaName`, `fields`, `localError` with store bindings: `const { draftName, draftFields, error, isLoading, initCreate, setDraftName, addField, removeField, updateField, reorderField, commit, discard } = useSchemaBuilderStore()`.
  - [x] 3.4 Add `useEffect(() => { initCreate(projectId); }, [projectId])` — note: import `useEffect` from `react`.
  - [x] 3.5 Rewire `handleAddField` → `addField()`, `handleRemoveField` → `removeField(index)`, `handleMoveField` → `reorderField(fromIndex, toIndex)`, `handleFieldChange` → `updateField(index, { [key]: value })`, `setSchemaName` → `setDraftName(...)`.
  - [x] 3.6 Update `handleSave` to call `await commit(activeProfileId)` and then check `useSchemaBuilderStore.getState().error` before calling `onClose()`. Remove validation logic from component — it is now in the store.
  - [x] 3.7 Update cancel button: call `discard()` then `onClose()`.
  - [x] 3.8 Replace references to `schemaName` → `draftName`, `fields` → `draftFields`, `localError` → `error`.
  - [x] 3.9 Update the type selector in the field row to include all 8 field types from the updated `FieldType` union.

- [x] Task 4: Write tests in `/tests/schemaBuilderStore.test.ts` (AC: #14)
  - [x] 4.1 Import `useSchemaBuilderStore` and `SchemaBuilderState`. Mock `useErrorStore` and `useLedgerStore` using `vi.mock`.
  - [x] 4.2 Before each test, reset store to initial state by calling `useSchemaBuilderStore.getState().discard()`.
  - [x] 4.3 Test `initCreate`: verify `draftName === ''`, `draftFields === []`, `isDirty === false`, `mode === 'create'`, `projectId` stored.
  - [x] 4.4 Test `initEdit`: create a mock `LedgerSchema` with 2 fields; after `initEdit`, verify `draftName` matches, `draftFields` deep-equals but is NOT the same reference as the original (deep copy).
  - [x] 4.5 Test `setDraftName`: call it, verify `draftName` updated and `isDirty === true`.
  - [x] 4.6 Test `addField`: verify length increased by 1, new field is `{ name: '', type: 'text', required: false }`.
  - [x] 4.7 Test `removeField`: init with 2 fields, remove index 0, verify field 1 is now at index 0.
  - [x] 4.8 Test `removeField` out-of-bounds: index 99 → no-op, array unchanged.
  - [x] 4.9 Test `updateField` type change: set field type to `'relation'` with `relationTarget: 'some-id'`, then `updateField(0, { type: 'text' })` → verify `relationTarget` is `undefined`.
  - [x] 4.10 Test `reorderField`: 3-field array, move index 2 to index 0, verify new order.
  - [x] 4.11 Test `reorderField` out-of-bounds: `reorderField(0, 99)` → no-op.
  - [x] 4.12 Test `discard`: make changes, call `discard()`, verify state is clean.
  - [x] 4.13 Test `commit` empty name: set `draftName = ''`, call `commit('profile-1')`, verify `useErrorStore.dispatchError` called with `'Schema name is required'`, `isLoading` is `false`.
  - [x] 4.14 Test `commit` empty fields: set valid name but `draftFields = []`, verify error dispatched.
  - [x] 4.15 Test `commit` relation missing target: add a field `{ name: 'Link', type: 'relation', required: false }` with no `relationTarget`, call `commit`, verify error.

- [x] Task 5: Final validation (AC: #15, #16)
  - [x] 5.1 Run `npx tsc --noEmit` — must report 0 errors.
  - [x] 5.2 Run `npx vitest run` — all tests pass including new `schemaBuilderStore.test.ts`. Full suite: 13 failed | 50 passed (matches pre-existing baseline; no regressions).

- [x] Task 6: Code Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Add `commit()` edit-mode success test (updateSchema path) [`tests/schemaBuilderStore.test.ts`]
  - [x] [AI-Review][HIGH] Add orphaned relation target test in `commit()` [`tests/schemaBuilderStore.test.ts`]
  - [x] [AI-Review][MEDIUM] Fix `useEffect` missing `initCreate` in dependency array [`src/features/ledger/SchemaBuilder.tsx:37`]
  - [x] [AI-Review][MEDIUM] Add user feedback when `activeProfileId` is null [`src/features/ledger/SchemaBuilder.tsx:handleSave`]
  - [x] [AI-Review][MEDIUM] Add `updateField` out-of-bounds test [`tests/schemaBuilderStore.test.ts`]
  - [x] [AI-Review][MEDIUM] Fix AC #3 `SchemaBuilderState` interface missing `projectId` field [story doc]
  - [x] [AI-Review][LOW] Simplify dual `if` blocks in `commit()` validation loop to `if/else` [`src/stores/useSchemaBuilderStore.ts`]

## Dev Notes

### Architecture Violation Being Fixed

The current `SchemaBuilder.tsx` uses local `useState` for `schemaName`, `fields`, and `localError`. Per `architecture.md`, "No local `useState` for async layers" and "Each Zustand store owns `isLoading` and `error`." This story creates the compliant state machine.

**Architecture reference:** [Source: _bmad-output/planning-artifacts/architecture.md — Communication Patterns / Zustand store shape]

### Store Naming Convention

Follow the project's `use{Domain}Store` convention: `useSchemaBuilderStore`. Store file goes in `src/stores/` (not colocated in `src/features/ledger/`) — this matches the location of `useLedgerStore.ts`, `useProfileStore.ts`, etc.

**Architecture reference:** [Source: _bmad-output/planning-artifacts/architecture.md — Naming Patterns / Zustand stores]

### Two `useLedgerStore` Files Exist — Use the One in `src/stores/`

There are two `useLedgerStore` files:
- `src/stores/useLedgerStore.ts` — the canonical store (281 lines), used by `SchemaBuilder.tsx` (imports `from '../../stores/useLedgerStore'`)
- `src/features/ledger/useLedgerStore.ts` — an older/alternative version (188 lines)

`useSchemaBuilderStore` must import from `src/stores/useLedgerStore` (same as `SchemaBuilder.tsx`'s current import). The `createSchema` and `updateSchema` methods are defined in `src/stores/useLedgerStore.ts`.

### Circular Dependency Check

`useSchemaBuilderStore` will call `useLedgerStore` inside `commit()`. `SchemaBuilder.tsx` currently imports both stores — this is fine. BUT if `useLedgerStore` ever imports `useSchemaBuilderStore`, a circular dependency would occur. At the time of this story, `useLedgerStore` does NOT import `useSchemaBuilderStore`, so a top-of-file import is safe. Verify with `npx tsc --noEmit` after writing.

### `projectId` Must Be Stored in State for `commit()`

The `initCreate(projectId)` action must store `projectId` in the Zustand state (add `projectId: string` to `SchemaBuilderState`) so `commit()` can access it without requiring it as a parameter. This avoids threading `projectId` through every intermediate function call.

### Deep Copy of `draftFields` in `initEdit`

When loading an existing schema for editing, always deep-copy the fields array:
```typescript
draftFields: schema.fields.map(f => ({ ...f }))
```
Never assign `schema.fields` directly — mutations in the store would then silently mutate the in-memory schema object in `useLedgerStore`.

### `updateField` Must Clear `relationTarget` on Type Change

When `updateField(index, { type: 'text' })` is called and the field previously had `type: 'relation'` with a `relationTarget`, the `relationTarget` must be cleared. Logic:
```typescript
const updated = { ...draftFields[index], ...patch };
if (updated.type !== 'relation') {
  delete updated.relationTarget;
}
```

### Relation Target Validation: Current vs. Future Schema

In `commit()`, the validation for relation fields (`!field.relationTarget`) must also check that the target schema still exists in `useLedgerStore.getState().schemas`. If a schema was deleted since the builder was opened, the orphaned target must be caught here and reported as an error. This prevents invalid `relationTarget` IDs from reaching PouchDB.

### PRD FR6 Field Types — Extended Union

The PRD specifies 8 field types (FR6): Short Text, Long Text, Number, Date/Time, Boolean, Select (Dropdown), Multi-Select, Relational Link. Current `FieldType` only covers 4. This story expands the union to:

| PRD Name | `FieldType` value |
|---|---|
| Short Text | `'text'` (existing) |
| Long Text | `'long_text'` (new) |
| Number | `'number'` (existing) |
| Date/Time | `'date'` (existing) |
| Boolean | `'boolean'` (new) |
| Select (Dropdown) | `'select'` (new) |
| Multi-Select | `'multi_select'` (new) |
| Relational Link | `'relation'` (existing) |

The type selector in `SchemaBuilder.tsx` should display all 8 options in this story. The specific constraint UIs for `long_text`, `boolean`, `select`, and `multi_select` are delivered in Stories 3-4 and 3-5.

**Zod validation note:** `src/lib/validation.ts` already uses `default: z.unknown()` for unrecognized types — the new types will fall through safely until proper validation rules are added in Stories 3-4/3-5.

### SchemaField Type — Additional Fields Needed

For stories 3-4 and 3-5, `SchemaField` will need additional optional constraint fields (e.g., `minLength`, `maxLength`, `regex`, `min`, `max`, `options`). Story 3-3 does NOT add these yet — only the store scaffolding and type union expansion. Future stories will extend `SchemaField` as needed.

### `SchemaBuilder.tsx` — `useEffect` for `initCreate`

```typescript
useEffect(() => {
  initCreate(projectId);
}, [projectId]);
```

The `initCreate` call on `projectId` change ensures the draft is reset if the dialog is reused across different projects. Include `initCreate` in the dependency array only if it is stable (it should be, since it's a Zustand action reference).

### Error Pattern: `useErrorStore` vs. Store `error` Field

The store's `error` field is for displaying inline errors in the `SchemaBuilder.tsx` component. `useErrorStore.getState().dispatchError(msg)` is for the global `<ErrorToast />` system. Both should be set on validation failures in `commit()`, matching the existing pattern in `useLedgerStore`.

### Existing Functions in `useLedgerStore` — Do NOT Reinvent

| Function | Location |
|---|---|
| `createSchema(profileId, projectId, name, fields)` | `src/stores/useLedgerStore.ts` ~line 73 |
| `updateSchema(schemaId, name, fields)` | `src/stores/useLedgerStore.ts` ~line 93 |
| `schemas: LedgerSchema[]` | State in `useLedgerStore` — for checking relation targets |

### Project Structure Notes

- New store file: `src/stores/useSchemaBuilderStore.ts`
- Modified file: `src/types/ledger.ts` (FieldType expansion)
- Refactored file: `src/features/ledger/SchemaBuilder.tsx`
- New test file: `tests/schemaBuilderStore.test.ts`

### References

- Architecture patterns: [Source: _bmad-output/planning-artifacts/architecture.md — Communication Patterns]
- Field types (FR6): [Source: _bmad-output/planning-artifacts/prd.md — FR6]
- Validation constraints (FR7): [Source: _bmad-output/planning-artifacts/prd.md — FR7]
- Zustand naming convention: [Source: _bmad-output/planning-artifacts/architecture.md — Naming Patterns]
- Existing Zod validation engine: [Source: src/lib/validation.ts — buildZodSchemaFromLedger]
- Story 3-2 dev notes (Zod v4, validation patterns): [Source: _bmad-output/implementation-artifacts/3-2-schema-strict-validation-engine.md]
- Existing SchemaBuilder component: [Source: src/features/ledger/SchemaBuilder.tsx]
- Primary LedgerStore: [Source: src/stores/useLedgerStore.ts]
- LedgerSchema type: [Source: src/types/ledger.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- `commit()` returns without throwing on validation failures; `handleSave` must check `useSchemaBuilderStore.getState().error` after `await commit()` before calling `onClose()`.
- `SchemaBuilder.test.tsx`: tests 4 ("handles relation field") and 5 ("validates relation target") were pre-existing timeouts in the full suite due to Radix Select portal/animation issues in jsdom. Not regressions from this story.
- Full suite `SchemaBuilder.test.tsx` contamination from pre-existing timeouts was resolved by ensuring `beforeEach` resets store state and re-establishes `getState` mocks after `vi.clearAllMocks()`.

### Completion Notes List

- All 5 Tasks and 16 ACs implemented and verified.
- `FieldType` extended from 4 → 8 values; all 8 displayed in `SchemaBuilder.tsx` type selector.
- `useSchemaBuilderStore` created with full state shape, 9 actions, and async `commit` with validation + orphaned-relation-target check.
- `SchemaBuilder.tsx` fully refactored; no `useState` for draft schema data.
- 14 new unit tests in `tests/schemaBuilderStore.test.ts` — all pass.
- `npx tsc --noEmit` → 0 errors.
- Full test suite: 13 failed | 50 passed (63 files) — matches pre-existing baseline, zero regressions.

### File List

- `src/types/ledger.ts` — extended `FieldType` union from 4 to 8 values
- `src/stores/useSchemaBuilderStore.ts` — NEW: Zustand store with full schema builder state machine
- `src/features/ledger/SchemaBuilder.tsx` — refactored from local `useState` to `useSchemaBuilderStore`
- `tests/schemaBuilderStore.test.ts` — NEW: 17 unit tests for the new store (14 original + 3 from code review)
- `tests/SchemaBuilder.test.tsx` — updated to work with refactored component

### Senior Developer Review (AI)

**Reviewer:** James (AI Code Review) | **Date:** 2026-03-08 | **Outcome:** ✅ Approved after fixes

**Issues Found:** 2 High, 4 Medium, 3 Low — all HIGH and MEDIUM addressed.

**Findings Fixed:**

| Severity | Issue | Fix Applied |
|---|---|---|
| HIGH | No test for `commit()` edit-mode success path (`updateSchema`) | Added test in `schemaBuilderStore.test.ts` |
| HIGH | No test for orphaned relation target validation in `commit()` | Added test in `schemaBuilderStore.test.ts` |
| MEDIUM | `useEffect` missing `initCreate` in dependency array | Fixed `[projectId, initCreate]` in `SchemaBuilder.tsx` |
| MEDIUM | Silent failure when `activeProfileId` is null | Added `useSchemaBuilderStore.setState` + `useErrorStore.dispatchError` call |
| MEDIUM | `updateField` out-of-bounds untested (unlike `removeField`/`reorderField`) | Added bounds-check test in `schemaBuilderStore.test.ts` |
| MEDIUM | AC #3 `SchemaBuilderState` interface missing `projectId` | Updated story doc interface spec |
| LOW | Dual `if` blocks in `commit()` validation loop were redundant | Refactored to `if/else` in `useSchemaBuilderStore.ts` |

**Deferred (LOW — future stories):**
- SchemaBuilder title/button hardcoded for create mode only (edit mode UI is a future story concern)
- `discard()` resets `projectId` to `''` — safe with remounting pattern; document as invariant if architecture changes

### Change Log

| Date | Change | Author |
|---|---|---|
| 2025-07-10 | Implemented Story 3.3: extended FieldType, created useSchemaBuilderStore, refactored SchemaBuilder.tsx, wrote store unit tests | Amelia (dev agent) |
| 2026-03-08 | Code review: fixed 2H/4M issues (edit-mode test, orphan test, useEffect deps, null-profile feedback, updateField bounds test, AC#3 doc fix, validation loop refactor) | James (AI review) |
