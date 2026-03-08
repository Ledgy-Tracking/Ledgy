# Story 1.3: Zustand Store Topology

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **the application to have a strict global store initialization pattern with no local useState for async layers**,
so that **all state management is centralized, predictable, and follows the architecture's error handling patterns**.

## Acceptance Criteria

1. Global Zustand stores are created for each feature domain (auth, profiles, ledger, nodeEditor, dashboard, sync, error)
2. Each store contains `isLoading` and `error` state fields
3. No local `useState` is used for async loading or error handling in components
4. All errors are dispatched to `useErrorStore` and displayed via `<ErrorToast />`
5. Stores follow the feature-first organization pattern
6. Store actions are co-located within store definitions
7. TypeScript strict mode compiles without errors
8. Unit tests verify store initialization and action behavior
9. Store naming follows `use{Domain}Store` convention
10. Previous story patterns (AuthGuard, ErrorBoundary) are leveraged

## Tasks / Subtasks

- [ ] Task 1: Verify/refactor global error store foundation (AC: #1, #4)
  - [ ] Review existing `useErrorStore` from Story 1-2 (already exists)
  - [ ] Verify `AppError` interface has message, type, timestamp
  - [ ] Verify `dispatchError` and `clearError` actions work correctly
  - [ ] Confirm integration with existing ErrorToast component
  - [ ] Refactor if needed to match story requirements
- [ ] Task 2: Create auth store with proper state management (AC: #1, #2, #3)
  - [ ] Review existing `useAuthStore` from Story 1-2
  - [ ] Verify `isLoading` and `error` fields exist (add if missing)
  - [ ] Ensure all async operations update store state (not local useState)
  - [ ] Verify TOTP unlock flow uses store state only
- [ ] Task 3: Create profile store pattern (AC: #1, #2, #5, #6)
  - [ ] Create `useProfileStore` in `src/features/profiles/useProfileStore.ts`
  - [ ] Implement profile state: `profiles`, `activeProfileId`, `isLoading`, `error`
  - [ ] Implement actions: `loadProfiles`, `setActiveProfile`, `clearActiveProfile`
  - [ ] Add error dispatch to `useErrorStore` on failures
  - [ ] Note: PouchDB integration is stub/mock only - actual DB integration in Story 1.5
- [ ] Task 4: Create ledger store pattern (AC: #1, #2, #5, #6)
  - [ ] Create `useLedgerStore` in `src/features/ledger/useLedgerStore.ts`
  - [ ] Implement ledger state: `entries`, `schemas`, `isLoading`, `error`
  - [ ] Implement actions: `loadEntries`, `createEntry`, `updateEntry`, `deleteEntry`
  - [ ] Add PouchDB integration structure (mock/stub for now - full integration in 1.5)
- [ ] Task 5: Create node editor store pattern (AC: #1, #2, #5, #6)
  - [ ] Create `useNodeStore` in `src/features/nodeEditor/useNodeStore.ts`
  - [ ] Implement node state: `nodes`, `edges`, `isLoading`, `error`
  - [ ] Implement actions: `addNode`, `updateNodePosition`, `addEdge`, `deleteNode`
  - [ ] Add debounced persistence logic structure (1 second after drag stop)
- [ ] Task 6: Create sync store pattern (AC: #1, #2, #5, #6)
  - [ ] Create `useSyncStore` in `src/features/sync/useSyncStore.ts`
  - [ ] Implement sync state: `isSyncing`, `lastSyncTime`, `conflicts`, `isLoading`, `error`
  - [ ] Implement actions: `triggerSync`, `resolveConflict`, `clearConflicts`
  - [ ] Add PouchDB replication event listener structure (mock for now)
- [ ] Task 7: Create dashboard store pattern (AC: #1, #2, #5, #6)
  - [ ] Create `useDashboardStore` in `src/features/dashboard/useDashboardStore.ts`
  - [ ] Implement dashboard state: `widgets`, `layout`, `isLoading`, `error`
  - [ ] Implement actions: `addWidget`, `updateLayout`, `removeWidget`
  - [ ] Add subscription hook to node store outputs (structure only - full wiring in 1.5)
- [ ] Task 8: Write unit tests for all stores (AC: #8)
  - [ ] Test useErrorStore dispatch and clear
  - [ ] Test useProfileStore load and set actions
  - [ ] Test useLedgerStore CRUD operations (with mock PouchDB)
  - [ ] Test useNodeStore position updates
  - [ ] Test useSyncStore conflict detection (with mock events)
  - [ ] Test useDashboardStore layout updates
- [ ] Task 9: Verify no local useState for async state (AC: #3)
  - [ ] Audit existing components for useState violations
  - [ ] Refactor any components using local useState for loading/error
  - [ ] Document pattern in Dev Notes for future reference

## Dev Notes

### Critical Technical Requirements

**Zustand Store Pattern** (per architecture.md):
```typescript
// Each store MUST have isLoading and error fields
// NO local useState for async loading - offload to store
// Errors dispatch to useErrorStore → displayed via ErrorToast
```

**Store Structure** (per architecture.md):
```typescript
interface DomainStore {
  // State fields
  isLoading: boolean;
  error: string | null;
  // Domain-specific state
  // Actions co-located in store definition
}
```

**Error Handling Pattern**:
```typescript
// All errors caught → dispatched to useErrorStore → displayed via ErrorToast
// No ad-hoc local error state in components
try {
  await someAsyncOperation();
} catch (error) {
  dispatchError(error.message, 'error');
}
```

**Scope Boundary** (CRITICAL):
```
This story creates STORE STRUCTURE and PATTERNS only.
- ✅ Create store files with state interfaces and actions
- ✅ Implement isLoading/error pattern in all stores
- ✅ Wire up error dispatch to useErrorStore
- ✅ Write unit tests with mock data
- ❌ Full PouchDB integration (Story 1.5)
- ❌ Real service layer integration (Story 1.5)
- ❌ Cross-store subscription wiring (Story 1.5+)
```

**Store Dependency Map**:
```
useErrorStore (shared - all stores dispatch here)
    ↑
useAuthStore (existing - Story 1-2)
useProfileStore (new - independent)
useLedgerStore (new - independent, PouchDB in 1.5)
useNodeStore (new - independent, persistence in 1.5)
useSyncStore (new - depends on PouchDB events, mock for now)
useDashboardStore (new - SUBSCRIBES TO useNodeStore outputs)
```

### Project Structure Notes

**Store Organization** (per architecture.md):
```
src/
├── stores/
│   └── useErrorStore.ts       # Global error state (shared)
└── features/
    ├── auth/
    │   └── useAuthStore.ts    # Auth state (existing from 1-2)
    ├── profiles/
    │   └── useProfileStore.ts # Profile management
    ├── ledger/
    │   └── useLedgerStore.ts  # Relational ledger
    ├── nodeEditor/
    │   └── useNodeStore.ts    # Node forge state
    ├── sync/
    │   └── useSyncStore.ts    # Sync status
    └── dashboard/
        └── useDashboardStore.ts # Dashboard widgets
```

**Alignment with unified project structure**:
- Feature folders use `camelCase` naming: `src/features/{name}/`
- Store files use `use{Domain}Store.ts` naming
- Tests are co-located: `useProfileStore.test.ts` next to `useProfileStore.ts`
- Hooks use `useCamelCase`: All store exports follow this pattern

### Architecture Compliance

**All stores MUST follow these patterns from architecture.md**:

- **Naming**: `use{Domain}Store` convention (e.g., `useProfileStore`, `useLedgerStore`)
- **Structure**: Each store contains `isLoading`, `error`, and domain-specific state
- **Actions**: Co-located within store definition (not separate files)
- **Error Handling**: All errors dispatched to `useErrorStore`
- **No Local State**: Components MUST NOT use `useState` for async loading/error
- **TypeScript Strict Mode**: All stores fully typed with interfaces

**Critical Rules from project-context.md**:
- Zustand State Management: Global stores own specific domains
- React Components: Do not use local `useState` for async loading or error handling
- Error Routing: Errors caught → dispatched to `useErrorStore` → displayed via `<ErrorToast />`
- Feature Encapsulation: Store, actions, and state in single co-located file

### Library/Framework Requirements

**Core Dependencies** (already installed from Story 1-1):
- `react`: ^19.0.0
- `zustand`: Latest stable (already installed)
- `pouchdb`: ^9.0.0 (already installed for store integration)

**Zustand Patterns to Use**:
- `create()` for store creation
- `persist` middleware for stores that need persistence (auth, profiles)
- `useShallow` selector optimization for React Flow integration (Story 8.1)

**DO NOT install yet** (will be added in later stories):
- Additional Zustand middleware (unless critical for this story)

### Testing Standards

**Unit Tests (Vitest)**:
- Co-located with source files: `src/features/profiles/useProfileStore.test.ts`
- Use Vitest's built-in integration with Vite
- Test store initialization
- Test all actions with mock data
- Mock PouchDB for isolated testing
- Mock `useErrorStore` for error dispatch verification

**Critical Test Scenarios**:
1. ✅ Store initializes with correct default state
2. ✅ Actions update state correctly
3. ✅ Errors are dispatched to useErrorStore
4. ✅ isLoading toggles during async operations
5. ✅ Persistence works for stores that need it (auth, profiles)

### Git Branch Strategy

**Branch Decision**: Using `main` branch for all epic implementation work (user preference).

**Rationale**: Consolidates all epic stories onto a single branch for streamlined development and easier integration, rather than creating separate `epic/epic-1` branch.

```bash
# Working on consolidated branch
git checkout main
```

All stories in Epic 1 (1-1 through 1-11) are implemented on this branch.

### Previous Story Intelligence (Story 1-2)

**Learnings from React Router & Error Boundaries**:
- ErrorBoundary component catches render errors and dispatches to `useErrorStore`
- AuthGuard already uses `useAuthStore` pattern - verify it follows the store topology
- ErrorToast integration is working - all stores should dispatch to this pattern
- Test patterns established: co-located tests with Vitest

**Files Created in Story 1-2**:
- `src/features/shell/ErrorBoundary.tsx` - Error boundary with store integration
- `src/features/auth/AuthGuard.tsx` - Uses useAuthStore (verify pattern compliance)
- `src/components/ErrorToast.tsx` - Global error display
- `src/stores/useErrorStore.ts` - Already exists, verify it matches this story's requirements

**Code Patterns to Reuse**:
- Error dispatch pattern: `useErrorStore.getState().dispatchError(message, type)`
- Test structure: describe/it blocks with beforeEach store reset
- TypeScript interfaces for state and actions

### References

- [Source: architecture.md#Frontend Architecture](planning-artifacts/architecture.md)
- [Source: architecture.md#Communication Patterns](planning-artifacts/architecture.md)
- [Source: architecture.md#Process Patterns](planning-artifacts/architecture.md)
- [Source: architecture.md#Complete Project Directory Structure](planning-artifacts/architecture.md)
- [Source: project-context.md#Technology Stack & Versions](project-context.md)
- [Source: project-context.md#Critical Implementation Rules](project-context.md)
- [Source: epics.md#Epic 1: App Foundation & Core Security](planning-artifacts/epics.md)
- [Source: 1-2-react-router-error-boundaries.md#Dev Agent Record](implementation-artifacts/1-2-react-router-error-boundaries.md)

## Dev Agent Record

### Agent Model Used

BMad Method create-story workflow

### Debug Log References

### Completion Notes List

### File List

---

## Technical Requirements

### Mandatory Implementation Standards

1. **Use existing git branch**: You MUST work on the `main` branch (consolidated epic branch).

2. **No local useState for async state**: All loading and error state MUST be in Zustand stores - never local component useState.

3. **Error handling pattern**: All errors MUST be dispatched to `useErrorStore` and displayed via `<ErrorToast />`.

4. **Store naming convention**: All stores MUST follow `use{Domain}Store` pattern (e.g., `useProfileStore`).

5. **TypeScript strict mode**: All stores must be fully typed with interfaces - no `any` types.

6. **Test co-location**: All tests MUST be co-located with their source files.

7. **Feature encapsulation**: Each store file contains state interface, actions, and store creation in single file.

### Next Steps

After completing this story:
1. Commit all changes to `main` branch
2. Update sprint-status.yaml to mark this story as "done"
3. Proceed to Story 1.4: Three-Panel Shell Layout
