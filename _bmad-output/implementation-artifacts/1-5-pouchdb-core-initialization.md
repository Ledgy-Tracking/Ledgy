# Story 1.5: PouchDB Core Initialization

Status: ready-for-dev

<!-- Note: Validation is recommended. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **the application to have a robust PouchDB initialization layer with proper document adapters**,
so that **all data is stored locally with the correct naming conventions and can sync reliably**.

## Acceptance Criteria

1. PouchDB is initialized with memory adapter for tests and IndexedDB for production
2. Document adapter enforces `{type}:{uuid}` ID pattern for all documents
3. All documents have required envelope fields: `type`, `schema_version`, `createdAt`, `updatedAt`
4. Ghost reference pattern implemented: `isDeleted` and `deletedAt` fields for soft deletes
5. Database creation/deletion functions for profile databases
6. TypeScript strict mode compiles without errors
7. Unit tests cover document adapter, ID validation, and ghost references
8. No direct PouchDB usage in components - all access through db.ts abstraction
9. PouchDB plugins configured (memory adapter for testing)
10. Error handling dispatches to useErrorStore

## Tasks / Subtasks

- [ ] Task 1: Initialize PouchDB core module (AC: #1, #8, #9)
  - [ ] Create `src/lib/db.ts` as main PouchDB abstraction
  - [ ] Configure PouchDB with IndexedDB adapter for browser
  - [ ] Setup memory adapter for testing environment
  - [ ] Export database instance and utility functions
- [ ] Task 2: Create document adapter with ID validation (AC: #2, #3)
  - [ ] Create `src/lib/documentAdapter.ts` with generic wrappers
  - [ ] Implement ID pattern validation: `{type}:{uuid}`
  - [ ] Enforce required envelope fields on all documents
  - [ ] Add TypeScript generics for document type safety
- [ ] Task 3: Implement ghost reference pattern (AC: #4)
  - [ ] Add `isDeleted` and `deletedAt` fields to document interface
  - [ ] Create softDelete function that marks documents without hard deletion
  - [ ] Create query helpers that filter out soft-deleted documents by default
  - [ ] Add option to include deleted documents when needed
- [ ] Task 4: Create profile database functions (AC: #5)
  - [ ] Implement `createProfileDb(profileId: string)` function
  - [ ] Implement `deleteProfileDb(profileId: string)` function
  - [ ] Implement `getProfileDb(profileId: string)` singleton accessor
  - [ ] Add database existence check function
- [ ] Task 5: Add error handling integration (AC: #10)
  - [ ] Wrap all PouchDB operations in try/catch
  - [ ] Dispatch errors to useErrorStore on failures
  - [ ] Add user-friendly error messages for common failures
- [ ] Task 6: Write unit tests (AC: #7)
  - [ ] Test document ID pattern validation
  - [ ] Test envelope field enforcement
  - [ ] Test ghost reference soft delete
  - [ ] Test profile database creation/deletion
  - [ ] Test memory adapter for test environment
- [ ] Task 7: Verify TypeScript and architecture compliance (AC: #6, #8)
  - [ ] TypeScript strict mode: no errors
  - [ ] No direct PouchDB imports in components
  - [ ] All exports from db.ts are properly typed

## Dev Notes

### Critical Technical Requirements

**PouchDB Document Naming** (per architecture.md):
```typescript
// Document IDs MUST follow: {type}:{uuid}
// Examples: "entry:a1b2c3", "profile:x9y8z7", "schema:def456"
// DO NOT use _type or prefix fields with underscore
```

**Document Envelope** (per architecture.md):
```typescript
interface LedgyDocument {
  _id: string;           // "{type}:{uuid}"
  _rev?: string;
  type: string;         // "entry" | "schema" | "node" | "profile"
  schema_version: number;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  deletedAt?: string;    // Ghost Reference soft-delete
  isDeleted?: boolean;
}
```

**Error Handling Pattern**:
```typescript
// All PouchDB errors caught → dispatched to useErrorStore → displayed via ErrorToast
try {
  await db.put(doc);
} catch (error) {
  dispatchError(error.message, 'error');
}
```

### Project Structure Notes

**Database Module Organization**:
```
src/
├── lib/
│   ├── db.ts                  # Main PouchDB initialization and abstraction
│   └── documentAdapter.ts     # Generic document CRUD with validation
└── stores/
    └── useErrorStore.ts       # Error dispatch target
```

**Alignment with architecture.md**:
- Utilities in `src/lib/` (camelCase naming)
- Tests co-located: `db.test.ts` next to `db.ts`
- No direct PouchDB imports in features/components

### Architecture Compliance

**All code MUST follow these patterns from architecture.md**:

- **Naming**: `camelCase` for functions, `PascalCase` for interfaces
- **Document IDs**: `{type}:{uuid}` pattern strictly enforced
- **No Underscore Prefix**: Custom fields cannot start with `_` (reserved for PouchDB)
- **Error Handling**: All errors dispatched to useErrorStore
- **Type Safety**: Generic TypeScript types for document operations

**Integration with Previous Stories**:
- Story 1-2: ErrorBoundary catches any DB errors that bubble up
- Story 1-3: useErrorStore integration for error dispatch
- Story 1-4: Not directly related (UI layer)

### Library/Framework Requirements

**Core Dependencies** (already installed):
- `pouchdb`: ^9.0.0
- `pouchdb-adapter-memory`: For testing (verify installation)

**Required Setup**:
```typescript
import PouchDB from 'pouchdb';
import memoryAdapter from 'pouchdb-adapter-memory';
PouchDB.plugin(memoryAdapter);
```

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located: `src/lib/db.test.ts`, `src/lib/documentAdapter.test.ts`
- Use memory adapter for isolated tests
- Test ID validation, envelope enforcement, ghost references
- Mock useErrorStore for error dispatch verification

**Critical Test Scenarios**:
1. ✅ Document ID follows {type}:{uuid} pattern
2. ✅ Envelope fields automatically added to new documents
3. ✅ Soft delete sets isDeleted and deletedAt
4. ✅ Queries exclude deleted documents by default
5. ✅ Profile databases are isolated per profile ID
6. ✅ Errors dispatch to useErrorStore

### Git Branch Strategy

**Branch Decision**: Using `allatonce` branch for all epic implementation work.

```bash
git checkout allatonce
```

### Previous Story Intelligence

**From Story 1-2 (React Router & Error Boundaries)**:
- ErrorBoundary available for catching DB errors
- ErrorToast integration working

**From Story 1-3 (Zustand Store Topology)**:
- useErrorStore dispatch pattern established
- All stores follow error handling pattern

**Code Patterns to Reuse**:
- Error dispatch: `useErrorStore.getState().dispatchError(message, 'error')`
- Test structure from Story 1-3 stores

### References

- [Source: architecture.md#Data Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Format Patterns](planning-artifacts/architecture.md)
- [Source: architecture.md#Complete Project Directory Structure](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: project-context.md#Critical Implementation Rules](planning-artifacts/project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)

## Dev Agent Record

### Agent Model Used

BMad Method create-story workflow

### Debug Log References

### Completion Notes List

### File List

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `allatonce` branch.

2. **Document ID pattern**: ALL document IDs MUST follow `{type}:{uuid}` format.

3. **No underscore prefix**: Custom fields CANNOT start with `_` (reserved for PouchDB).

4. **Envelope fields**: ALL documents MUST have `type`, `schema_version`, `createdAt`, `updatedAt`.

5. **Ghost references**: Soft deletes MUST use `isDeleted` and `deletedAt` fields.

6. **Error handling**: ALL PouchDB errors MUST dispatch to useErrorStore.

7. **TypeScript strict mode**: ALL code must compile without errors.

8. **No direct PouchDB**: Components MUST import from `src/lib/db.ts` only.

### Next Steps

After completing this story:
1. Commit all changes to `allatonce` branch
2. Update sprint-status.yaml to mark this story as "done"
3. Proceed to Story 1.6: TOTP Registration UI
