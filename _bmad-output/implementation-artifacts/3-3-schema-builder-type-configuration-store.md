# Story 3.3: Schema Builder - Type Configuration Store

Status: ready-for-dev

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

- [ ] Task 1: Extend `FieldType` in `src/types/ledger.ts` (AC: #2)
  - [ ] 1.1 Open `src/types/ledger.ts`. Change the `FieldType` export from `'text' | 'number' | 'date' | 'relation'` to `'text' | 'number' | 'date' | 'relation' | 'long_text' | 'boolean' | 'select' | 'multi_select'`.
  - [ ] 1.2 Run `npx tsc --noEmit` and fix any type errors that arise from the expanded union (likely none, since existing switch statements use `default` fallback).
  - [ ] 1.3 Verify `src/lib/validation.ts` handles the new types via its existing `default: z.unknown()` branch — no changes needed.

- [ ] Task 2: Create `src/stores/useSchemaBuilderStore.ts` (AC: #1, #3–#12)
  - [ ] 2.1 Create the file. Import `create` from `zustand`, `SchemaField`, `LedgerSchema` from `../types/ledger`, `useErrorStore` from `./useErrorStore`.
  - [ ] 2.2 Define and export `SchemaBuilderState` interface with fields: `draftName`, `draftFields`, `mode`, `editingSchemaId`, `projectId`, `isDirty`, `isLoading`, `error`, and all actions.
  - [ ] 2.3 Define `initialState` object.
  - [ ] 2.4 Implement `initCreate(projectId)`: store `projectId` in store state for use in `commit`, then reset draft fields.
  - [ ] 2.5 Implement `initEdit(schema)`: deep-copy `schema.fields` via `schema.fields.map(f => ({ ...f }))` to avoid mutation.
  - [ ] 2.6 Implement `setDraftName`, `addField`, `removeField`, `updateField` (clear `relationTarget` if type changes), `reorderField` (splice pattern).
  - [ ] 2.7 Implement `commit`: validation checks first (dispatch to `useErrorStore`, set `error`, return early), then branch on `mode` to call either `createSchema` or `updateSchema` from `useLedgerStore`. **Use lazy import** to avoid circular dependency: `const { useLedgerStore } = await import('./useLedgerStore')` OR import at top-of-file (test first — if no circular, top-of-file is fine).
  - [ ] 2.8 Implement `discard`: spread `initialState` onto `set({...initialState})`.
  - [ ] 2.9 Export `useSchemaBuilderStore`.

- [ ] Task 3: Refactor `SchemaBuilder.tsx` (AC: #13)
  - [ ] 3.1 Read `src/features/ledger/SchemaBuilder.tsx` completely.
  - [ ] 3.2 Add import: `import { useSchemaBuilderStore } from '../../stores/useSchemaBuilderStore'`.
  - [ ] 3.3 Replace `useState` for `schemaName`, `fields`, `localError` with store bindings: `const { draftName, draftFields, error, isLoading, initCreate, setDraftName, addField, removeField, updateField, reorderField, commit, discard } = useSchemaBuilderStore()`.
  - [ ] 3.4 Add `useEffect(() => { initCreate(projectId); }, [projectId])` — note: import `useEffect` from `react`.
  - [ ] 3.5 Rewire `handleAddField` → `addField()`, `handleRemoveField` → `removeField(index)`, `handleMoveField` → `reorderField(fromIndex, toIndex)`, `handleFieldChange` → `updateField(index, { [key]: value })`, `setSchemaName` → `setDraftName(...)`.
  - [ ] 3.6 Update `handleSave` to call `await commit(activeProfileId)` and then `onClose()`. Remove validation logic from component — it is now in the store.
  - [ ] 3.7 Update cancel button: call `discard()` then `onClose()`.
  - [ ] 3.8 Replace references to `schemaName` → `draftName`, `fields` → `draftFields`, `localError` → `error`.
  - [ ] 3.9 Update the type selector in the field row to include all 8 field types from the updated `FieldType` union.

- [ ] Task 4: Write tests in `/tests/schemaBuilderStore.test.ts` (AC: #14)
  - [ ] 4.1 Import `useSchemaBuilderStore` and `SchemaBuilderState`. Mock `useErrorStore` and `useLedgerStore` using `vi.mock`.
  - [ ] 4.2 Before each test, reset store to initial state by calling `useSchemaBuilderStore.getState().discard()`.
  - [ ] 4.3 Test `initCreate`: verify `draftName === ''`, `draftFields === []`, `isDirty === false`, `mode === 'create'`, `projectId` stored.
  - [ ] 4.4 Test `initEdit`: create a mock `LedgerSchema` with 2 fields; after `initEdit`, verify `draftName` matches, `draftFields` deep-equals but is NOT the same reference as the original (deep copy).
  - [ ] 4.5 Test `setDraftName`: call it, verify `draftName` updated and `isDirty === true`.
  - [ ] 4.6 Test `addField`: verify length increased by 1, new field is `{ name: '', type: 'text', required: false }`.
  - [ ] 4.7 Test `removeField`: init with 2 fields, remove index 0, verify field 1 is now at index 0.
  - [ ] 4.8 Test `removeField` out-of-bounds: index 99 → no-op, array unchanged.
  - [ ] 4.9 Test `updateField` type change: set field type to `'relation'` with `relationTarget: 'some-id'`, then `updateField(0, { type: 'text' })` → verify `relationTarget` is `undefined`.
  - [ ] 4.10 Test `reorderField`: 3-field array, move index 2 to index 0, verify new order.
  - [ ] 4.11 Test `reorderField` out-of-bounds: `reorderField(0, 99)` → no-op.
  - [ ] 4.12 Test `discard`: make changes, call `discard()`, verify state is clean.
  - [ ] 4.13 Test `commit` empty name: set `draftName = ''`, call `commit('profile-1')`, verify `useErrorStore.dispatchError` called with `'Schema name is required'`, `isLoading` is `false`.
  - [ ] 4.14 Test `commit` empty fields: set valid name but `draftFields = []`, verify error dispatched.
  - [ ] 4.15 Test `commit` relation missing target: add a field `{ name: 'Link', type: 'relation', required: false }` with no `relationTarget`, call `commit`, verify error.

- [ ] Task 5: Final validation (AC: #15, #16)
  - [ ] 5.1 Run `npx tsc --noEmit` — must report 0 errors.
  - [ ] 5.2 Run `npx vitest run` — all tests pass including new `schemaBuilderStore.test.ts`.

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
