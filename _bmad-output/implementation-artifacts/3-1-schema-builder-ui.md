# Story 3.1: Schema Builder UI

Status: in-progress

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
6. **Version Migration:** Updating an existing schema increments its `schema_version` to support JIT migrations (NFR9). [Source: epics.md#Story 3.1]

## Tasks / Subtasks

- [ ] Task 1: Schema Builder UI Component (AC: 1, 2, 3)
  - [ ] Create `SchemaBuilder` component in `src/features/ledger/`.
  - [ ] Implement field type selector (Text, Number, Date, Relation).
  - [ ] Add field list with add/remove/reorder functionality.
  - [ ] Implement schema name input and validation.
- [ ] Task 2: Relation Field Configuration (AC: 4)
  - [ ] When Relation type selected, show ledger target selector.
  - [ ] Populate target selector with existing ledgers from PouchDB.
  - [ ] Validate relation target is not self (no circular relations).
- [ ] Task 3: Schema Persistence (AC: 5, 6)
  - [ ] Implement `create_schema` and `update_schema` in `src/lib/db.ts`.
  - [ ] Ensure schema documents follow `{type}:{uuid}` ID scheme.
  - [ ] Implement `schema_version` increment on updates.
  - [ ] Add error handling via `useErrorStore`.
- [ ] Task 4: Integration & Testing
  - [ ] Wire Schema Builder to Dashboard "Create Ledger" CTA (replace placeholder from Story 2.4).
  - [ ] Add unit tests for schema validation and persistence.
  - [ ] Add integration tests for full schema creation flow.

## Dev Notes

- **Design System:** Use `shadcn/ui` components (Form, Select, Button, Card).
- **Schema Document Structure:**
  ```typescript
  {
    _id: `schema:${uuid}`,
    _type: 'schema',
    schema_version: 1,
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

<!-- To be filled by dev agent -->

### Implementation Plan

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

<!-- To be filled by dev agent -->

### File List

<!-- To be filled by dev agent -->

### Change Log

<!-- To be filled by dev agent -->
