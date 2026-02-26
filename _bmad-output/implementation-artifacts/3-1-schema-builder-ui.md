# Story 3.1: Schema Builder UI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to define and edit custom schemas with distinct field types (Text, Number, Date, Relation),
So that my ledger structure perfectly matches the real-world data I am tracking.

## Acceptance Criteria

1. **Schema Creation:** User can create a new ledger by providing a name and defining its schema fields. [Source: epics.md#Story 3.1]
2. **Field Types:** Schema builder supports field types: Text, Number, Date, Relation (to other ledgers). [Source: epics.md#Story 3.1]
3. **Field Management:** User can add, reorder, and remove fields from the schema. [Source: epics.md#Story 3.1]
4. **Relation Target:** Relation fields can target any other existing ledger in the same project. [Source: epics.md#Story 3.1]
5. **Schema Persistence:** Saving the schema creates or updates the schema document in PouchDB with proper envelope. [Source: epics.md#Story 3.1]
6. **Version Migration:** Updating an existing schema increments its `schemaVersion` to support JIT migrations (NFR9). [Source: epics.md#Story 3.1]

## Tasks / Subtasks

- [x] Task 1: Schema Builder UI Component (AC: 1, 2, 3)
  - [x] Create `SchemaBuilder` component in `src/features/ledger/`.
  - [x] Implement field type selector (Text, Number, Date, Relation).
  - [x] Add field list with add/remove/reorder functionality.
  - [x] Implement schema name input and validation.
- [x] Task 2: Relation Field Configuration (AC: 4)
  - [x] When Relation type selected, show ledger target selector.
  - [x] Populate target selector with existing ledgers from PouchDB.
  - [x] Validate relation target is not self (no circular relations).
- [x] Task 3: Schema Persistence (AC: 5, 6)
  - [x] Implement `create_schema` and `update_schema` in `src/lib/db.ts`.
  - [x] Ensure schema documents follow `{type}:{uuid}` ID scheme.
  - [x] Implement `schemaVersion` increment on updates.
  - [x] Add error handling via `useErrorStore`.
- [x] Task 4: Integration & Testing
  - [x] Wire Schema Builder to Dashboard "Create Ledger" CTA (replace placeholder from Story 2.4).
  - [x] Add unit tests for schema validation and persistence.
  - [x] Add integration tests for full schema creation flow.

## Dev Notes

- **Design System:** Use `shadcn/ui` components (Form, Select, Button, Card).
- **Schema Document Structure:**
  ```typescript
  {
    _id: `schema:${uuid}`,
    type: 'schema',
    schemaVersion: 1,
    createdAt: ISO8601,
    updatedAt: ISO8601,
    name: string,
    fields: Array<{
      name: string,
      type: 'text' | 'number' | 'date' | 'relation',
      relationTarget?: string // ledger ID if type is 'relation'
    }>
  }
  ```
- **State Management:** Create `useLedgerStore` for schema state.
- **Validation:** Schema names must be unique, field names must be unique within schema.

### Project Structure Notes

- Components in `src/features/ledger/`
- DAL functions in `src/lib/db.ts`
- Store in `src/stores/useLedgerStore.ts`
- Types in `src/types/ledger.ts`

### References

- [Source: planning-artifacts/epics.md#Story 3.1]
- [Source: planning-artifacts/architecture.md#PouchDB Document Envelope]
- [Source: planning-artifacts/architecture.md#State Management]
- [Source: docs/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

Antigravity (Gemini 2.0 Flash Thinking)

### Debug Log References

- Implemented `SchemaBuilder` with field management and relation support.
- Added `create_schema` and `update_schema` to `db.ts`.
- Created `useLedgerStore` for state management.
- Fixed missing unit tests by creating `SchemaBuilder.test.tsx`.

### Completion Notes List

- ✅ Types created: LedgerSchema, LedgerEntry, SchemaField, FieldType
- ✅ DAL functions: create_schema, update_schema, list_schemas, get_schema, create_entry, update_entry, list_entries, delete_entry
- ✅ Store: useLedgerStore with full CRUD operations
- ✅ UI Component: SchemaBuilder with field management (add/remove/reorder, field types, relation config)
- ✅ Dashboard Integration: Replaced placeholder alert with SchemaBuilder modal
- ✅ Tests: `SchemaBuilder.test.tsx` implemented and passing (5/5).

### File List

- `src/types/ledger.ts` - NEW: Ledger types
- `src/lib/db.ts` - MODIFIED: Added schema/entry DAL functions
- `src/stores/useLedgerStore.ts` - NEW: Ledger Zustand store
- `src/features/ledger/SchemaBuilder.tsx` - MODIFIED: Schema builder UI with relation support and error handling
- `tests/SchemaBuilder.test.tsx` - NEW: Unit tests for SchemaBuilder (moved from src per standards)
- `src/features/dashboard/Dashboard.tsx` - MODIFIED: Integrated SchemaBuilder
- `src/features/dashboard/Dashboard.test.tsx` - MODIFIED: Updated test for new behavior

### Change Log

- **2026-02-23**: Story 3-1 implementation started - Schema Builder UI foundation complete
- **2026-02-25**: Fixed missing unit tests (`SchemaBuilder.test.tsx`).
- **2026-02-25**: Moved story to `review` status.
- **2026-02-25**: Adversarial Review Fixes: Implemented Relation target selector (AC4), integrated `useErrorStore`, and moved tests to `/tests` directory.

### Review Follow-ups (AI) - Adversarial Review 2026-02-25
- [x] [AI-Review][Critical] Missing Tests: Created `SchemaBuilder.test.tsx`.
- [x] [AI-Review][Medium] Dashboard Integration Incomplete: Unified `hasLedgers` check and improved CTA flow.
- [x] [AI-Review][High] AC4 Implementation: Replaced relation text input with populated ledger selector and added validation.
- [x] [AI-Review][High] Standards Violation: Moved `SchemaBuilder.test.tsx` to `/tests` directory.
- [x] [AI-Review][Medium] Error Handling: Integrated `useErrorStore` in `SchemaBuilder` component.
