# Story 4.3: Node Store & Debounced Persistence

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Node Forge user,
I want my node positions and canvas state to be automatically saved after I finish dragging or editing,
so that my workflow layout persists across sessions without manual save actions.

## Definition of Done

- [ ] All 10 acceptance criteria implemented and verified
- [ ] Unit test coverage ≥80% for new debounce logic
- [ ] Integration tests pass for all 6 test scenarios in Testing Requirements
- [ ] No regressions in existing 734 tests (story 4.2 baseline)
- [ ] Code review completed and approved
- [ ] Documentation updated (Dev Notes reflect actual implementation)
- [ ] Performance verified: no render count increases in React DevTools Profiler during drag operations
- [ ] Accessibility verified: keyboard navigation works, screen reader announcements tested

## Acceptance Criteria

1. **Global state tracks node positions** — The Zustand store (`useNodeStore`) maintains `nodes` and `edges` arrays with full React Flow node data including `id`, `type`, `position` (x, y), and `data`.

2. **Debounced persistence triggers on drag stop** — After `onNodeDragStop` fires (user releases a dragged node), a 1-second debounce timer starts. When the timer expires, `saveCanvas` is called to persist nodes/edges to PouchDB.

3. **Debounced persistence triggers on structural changes** — Adding, deleting, or connecting nodes/edges also triggers the same 1-second debounce persistence.

4. **Viewport state persists with debounce** — The canvas viewport (pan position x/y, zoom level) is saved to PouchDB alongside nodes/edges with the same 1-second debounce behavior and restored on next load via `loadCanvas`.

5. **Clean debounce cleanup** — The debounce timer is properly cleaned up on:
   - Component unmount
   - `workflowId` change (prevents cross-workflow saves)
   - New drag/structural change (resets timer)
   - Browser tab becomes hidden (`visibilitychange` event)

6. **PouchDB document structure** — Canvas data is stored as a `canvas:{workflowId}` document with fields: `type: 'canvas'`, `profileId`, `projectId`, `workflowId`, `nodes` (array), `edges` (array), `viewport` (object), `schemaVersion: 1`, plus standard `createdAt`/`updatedAt` timestamps.

7. **No persistence during active drag** — While a node is being actively dragged (`onNodeDrag` firing), no persistence occurs. Only `onNodeDragStop` triggers the debounce.

8. **Error handling with recovery** — PouchDB save failures dispatch to `useErrorStore` with user-friendly message "Failed to save canvas changes". The error does not crash the canvas. Failed saves are automatically retried up to 3 times with exponential backoff (1s, 2s, 4s). After max retries, error state persists until user manually retries via UI or next edit triggers new save attempt.

9. **Debouncing prevents excessive saves** — Multiple rapid changes within 1 second only trigger one save. The debounce mechanism clears pending timers before scheduling new ones.

10. **Type safety** — All canvas persistence functions are typed: `saveCanvas(profileId: string, projectId: string, workflowId: string, nodes: CanvasNode[], edges: CanvasEdge[], viewport: Viewport)`.

## Type Definitions

```typescript
// Node and Edge types extending React Flow
interface CanvasNode extends Node {
  id: string;
  type: 'ledgerSource' | 'correlation' | 'arithmetic' | 'trigger' | 'dashboardOutput';
  position: { x: number; y: number };
  data: {
    label: string;
    // Node-specific data fields
    ledgerId?: string;
    operation?: string;
    [key: string]: any;
  };
}

interface CanvasEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'data';
  animated?: boolean;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
```

## Tasks / Subtasks

### Phase 1: Foundation (Must complete first)

- [ ] Task 0 — Verify PouchDB document structure and load logic (AC: #6)
  - [ ] 0.1 Verify `save_canvas` in `src/lib/db.ts` creates document with `schemaVersion: 1`
  - [ ] 0.2 Verify `load_canvas` returns correct structure with `nodes`, `edges`, `viewport`
  - [ ] 0.3 Add `schemaVersion` field migration helper if needed

- [ ] Task 1 — Verify and extend `useNodeStore` state structure (AC: #1, #4)
  - [ ] 1.1 Confirm `nodes: CanvasNode[]` and `edges: CanvasEdge[]` in store state
  - [ ] 1.2 Confirm `viewport: Viewport` with defaults `{ x: 0, y: 0, zoom: 1 }`
  - [ ] 1.3 Add `setViewport(viewport: Viewport)` action
  - [ ] 1.4 Add `isCanvasLoaded: boolean` flag to prevent initial save after load
  - [ ] 1.5 Add `isSaveInProgress: boolean` flag for save serialization

### Phase 2: Debounce Mechanism

- [ ] Task 2 — Implement debounced save mechanism in `useNodeStore` (AC: #2, #3, #5, #9)
  - [ ] 2.1 Add module-level variable `let saveTimeoutId: number | null = null` (outside store, not in state)
  - [ ] 2.2 Create `debouncedSaveCanvas()` action that:
    - Captures current IDs (`activeProfileId`, `activeProjectId`, `activeWorkflowId`) immediately at call time
    - Captures current data (`nodes`, `edges`, `viewport`) immediately at call time
    - Clears existing `saveTimeoutId` if any
    - Sets new 1000ms timeout
    - Inside timeout: verifies IDs still match captured values before calling `saveCanvas`
    - Stores timeout ID in module-level variable
  - [ ] 2.3 Create `clearDebouncedSave()` action that clears `saveTimeoutId` and cancels pending timeout
  - [ ] 2.4 Create `saveCanvasWithRetry(capturedIds, capturedData, attemptCount = 0)` for automatic retry logic

- [ ] Task 3 — Implement visibilitychange and beforeunload handlers (AC: #5)
  - [ ] 3.1 Add `visibilitychange` event listener: clear debounce and immediate save if `document.hidden`
  - [ ] 3.2 Add `beforeunload` handler: sync save if pending debounce exists
  - [ ] 3.3 Clean up event listeners on store reset

### Phase 3: Event Wiring

- [ ] Task 4 — Wire drag stop to debounced save (AC: #2, #7)
  - [ ] 4.1 In `NodeCanvas.tsx`, ensure `onNodeDragStop` handler exists with signature `(event, node) => void`
  - [ ] 4.2 Validate `node` parameter is not null/undefined before triggering save
  - [ ] 4.3 Call `useNodeStore.getState().debouncedSaveCanvas()` from `onNodeDragStop`
  - [ ] 4.4 Verify `onNodeDrag` does NOT call debounced save

- [ ] Task 5 — Wire structural changes to debounced save (AC: #3)
  - [ ] 5.1 Call `debouncedSaveCanvas()` after `onNodesChange` completes (React Flow batches multiple changes into single callback)
  - [ ] 5.2 Call `debouncedSaveCanvas()` after `onEdgesChange` completes
  - [ ] 5.3 Call `debouncedSaveCanvas()` after `onConnect` (new edge created)
  - [ ] 5.4 Verify batch handling: 10 node deletions = ONE debounced save, not 10

- [ ] Task 6 — Implement viewport change persistence (AC: #4)
  - [ ] 6.1 Wire `onViewportChange` from React Flow to `setViewport`
  - [ ] 6.2 Call `debouncedSaveCanvas()` from viewport change handler (same 1s debounce)

### Phase 4: Cleanup and Error Handling

- [ ] Task 7 — Implement cleanup on workflowId change (AC: #5)
  - [ ] 7.1 In `NodeCanvas.tsx`, BEFORE loading new workflow: call `clearDebouncedSave()`
  - [ ] 7.2 Set `isCanvasLoaded = false` before loading
  - [ ] 7.3 Set `isCanvasLoaded = true` after successful load (prevents immediate re-save)
  - [ ] 7.4 Add cleanup in `useEffect` return on unmount

- [ ] Task 8 — Add error handling and recovery (AC: #8)
  - [ ] 8.1 In `saveCanvas` action, wrap PouchDB call in try/catch
  - [ ] 8.2 On error: `useErrorStore.getState().dispatchError('Failed to save canvas changes')`
  - [ ] 8.3 Set store error state: `set({ error: errorMsg, saveError: errorMsg })`
  - [ ] 8.4 Implement exponential backoff retry (max 3 attempts)
  - [ ] 8.5 Clear error state on successful save

- [ ] Task 9 — Handle concurrent tab scenarios
  - [ ] 9.1 Detect PouchDB conflicts (409 status or `_rev` mismatch)
  - [ ] 9.2 On conflict: refresh canvas from DB and notify user
  - [ ] 9.3 Add `lastSavedAt` timestamp to detect stale saves

### Phase 5: Testing and Validation

- [ ] Task 10 — Add regression tests for story 4.2 fixes
  - [ ] 10.1 Test `loadedRef` reset on workflowId change (from 4.2 bug #1)
  - [ ] 10.2 Test `useShallow` usage from `@xyflow/react` (from 4.2 bug #2)
  - [ ] 10.3 Test workflowId closure capture (from 4.2 bug #3)
  - [ ] 10.4 Test abort mechanism for pending loads (from 4.2 bug #4)
  - [ ] 10.5 Test stale closure prevention (from 4.2 bug #5)
  - [ ] 10.6 Test error state management (from 4.2 bug #6)

- [ ] Task 11 — Add test coverage for new functionality (AC: all)
  - [ ] 11.1 Unit test: debounce timer resets on multiple rapid changes (verify `clearTimeout` called)
  - [ ] 11.2 Unit test: save only fires after 1 second of inactivity (use fake timers)
  - [ ] 11.3 Unit test: workflowId change clears pending debounce
  - [ ] 11.4 Unit test: viewport changes trigger debounced save
  - [ ] 11.5 Unit test: error recovery with exponential backoff (verify 3 retries)
  - [ ] 11.6 Unit test: batch node changes trigger single save (delete 10 nodes = 1 save)
  - [ ] 11.7 Unit test: no save during `isCanvasLoaded === false`
  - [ ] 11.8 Integration test: drag node → release → advance timers → verify PouchDB put called
  - [ ] 11.9 Integration test: workflow switch during pending save → verify clearDebouncedSave called
  - [ ] 11.10 Integration test: simulate PouchDB failure → verify retry mechanism

- [ ] Task 12 — Add visual feedback requirements
  - [ ] 12.1 Add `isSaving` state to store
  - [ ] 12.2 Show "Saving..." indicator in NodeCanvas when debounce active or save in progress
  - [ ] 12.3 Show "Saved" confirmation briefly after successful save
  - [ ] 12.4 Show error indicator when save fails (with retry button)

- [ ] Task 13 — Run full test suite and performance validation (AC: all, DoD)
  - [ ] 13.1 Run `npm test` and ensure all 734+ tests pass
  - [ ] 13.2 Run React DevTools Profiler: verify no render count increases during drag operations
  - [ ] 13.3 Verify 60fps maintained during canvas pan/zoom (Chrome DevTools Performance tab)
  - [ ] 13.4 Accessibility test: keyboard drag operations work with debounce
  - [ ] 13.5 Accessibility test: screen reader announces save status changes

## Dev Notes

### Architecture Context

Story 4.3 is the **third story in Epic 4 (Node Forge)** and builds directly on 4.2 (React Flow Canvas Core & Viewport). The debounced persistence mechanism is the foundation for all subsequent Node Forge stories (4.4 through 4.17).

**Key architectural decisions from PRD:**
- **State Management**: Zustand for global state, React Flow for local canvas state
- **Persistence**: PouchDB via `src/lib/db.ts` — NO Tauri commands for canvas operations
- **Performance**: <50ms interaction latency requirement (NFR1), 60fps canvas requirement (NFR2)

**From Architecture Document:**
- **Store Pattern**: `src/stores/useNodeStore.ts` with `subscribeWithSelector` middleware
- **Document IDs**: `canvas:{workflowId}` format
- **Naming**: `camelCase` for TypeScript fields, `PascalCase` for components
- **Error Handling**: Always dispatch to `useErrorStore`, never `console.error` alone

### Critical Implementation Details

#### Debounce Implementation Pattern (FIXED RACE CONDITION)

**CRITICAL**: Capture IDs and data at CALL time, not inside setTimeout:

```typescript
// Module-level variable (NOT in store state)
let saveTimeoutId: number | null = null;

debouncedSaveCanvas: () => {
  // CAPTURE IMMEDIATELY at call time
  const store = get();
  const capturedProfileId = store.activeProfileId;
  const capturedProjectId = store.activeProjectId;
  const capturedWorkflowId = store.activeWorkflowId;
  const capturedNodes = store.nodes;
  const capturedEdges = store.edges;
  const capturedViewport = store.viewport;
  
  // Validate captured data
  if (!capturedProfileId || !capturedProjectId || !capturedWorkflowId) return;
  
  // Clear existing timeout
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
  }
  
  // Set new timeout using CAPTURED values (not fresh get())
  saveTimeoutId = window.setTimeout(() => {
    // Verify IDs still match before saving (prevent cross-workflow save)
    const current = get();
    if (
      current.activeProfileId === capturedProfileId &&
      current.activeProjectId === capturedProjectId &&
      current.activeWorkflowId === capturedWorkflowId
    ) {
      get().saveCanvasWithRetry(
        { profileId: capturedProfileId, projectId: capturedProjectId, workflowId: capturedWorkflowId },
        { nodes: capturedNodes, edges: capturedEdges, viewport: capturedViewport }
      );
    }
    saveTimeoutId = null;
  }, 1000);
},

clearDebouncedSave: () => {
  if (saveTimeoutId) {
    clearTimeout(saveTimeoutId);
    saveTimeoutId = null;
  }
},
```

#### Save with Retry and Error Recovery

```typescript
saveCanvasWithRetry: async (ids, data, attemptCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
  
  set({ isSaveInProgress: true, saveError: null });
  
  try {
    await saveCanvas(ids.profileId, ids.projectId, ids.workflowId, 
                     data.nodes, data.edges, data.viewport);
    set({ isSaveInProgress: false, lastSavedAt: Date.now(), error: null });
  } catch (err: any) {
    const errorMsg = err.message || 'Failed to save canvas changes';
    set({ error: errorMsg, saveError: errorMsg, isSaveInProgress: false });
    useErrorStore.getState().dispatchError(errorMsg);
    
    // Retry logic
    if (attemptCount < MAX_RETRIES) {
      setTimeout(() => {
        get().saveCanvasWithRetry(ids, data, attemptCount + 1);
      }, RETRY_DELAYS[attemptCount]);
    }
  }
},
```

#### Tab Visibility and Beforeunload Handling

```typescript
// In useNodeStore initialization or App.tsx
const handleVisibilityChange = () => {
  if (document.hidden) {
    // Tab hidden: clear debounce and save immediately
    useNodeStore.getState().clearDebouncedSave();
    const { activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport } = get();
    if (activeProfileId && activeProjectId && activeWorkflowId) {
      saveCanvas(activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport);
    }
  }
};

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  const state = useNodeStore.getState();
  if (state._saveTimeoutId) { // Check if debounce pending
    // Attempt synchronous save (or warn user)
    state.clearDebouncedSave();
    // ...save logic...
    e.preventDefault();
    e.returnValue = '';
  }
};

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('beforeunload', handleBeforeUnload);
```

#### Event Wiring in NodeCanvas.tsx

```typescript
// Handler signatures with validation
const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node | null) => {
  if (!node) return; // Validation
  useNodeStore.getState().debouncedSaveCanvas();
}, []);

const handleViewportChange = useCallback((viewport: Viewport) => {
  useNodeStore.getState().setViewport(viewport);
  useNodeStore.getState().debouncedSaveCanvas();
}, []);

// Structural changes - React Flow batches these
const handleNodesChange = useCallback((changes: NodeChange[]) => {
  useNodeStore.getState().onNodesChange(changes);
  // React Flow calls this ONCE per batch, not per node
  useNodeStore.getState().debouncedSaveCanvas();
}, []);

const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
  useNodeStore.getState().onEdgesChange(changes);
  useNodeStore.getState().debouncedSaveCanvas();
}, []);

const handleConnect = useCallback((connection: Connection) => {
  useNodeStore.getState().onConnect(connection);
  useNodeStore.getState().debouncedSaveCanvas();
}, []);
```

#### Workflow Change Cleanup (CORRECT ORDER)

```typescript
// In NodeCanvas.tsx useEffect - CRITICAL ORDER
useEffect(() => {
  // 1. FIRST: Clear any pending debounce
  useNodeStore.getState().clearDebouncedSave();
  
  // 2. Mark as not loaded (prevents immediate re-save)
  useNodeStore.getState().setIsCanvasLoaded(false);
  
  // 3. Load new canvas
  loadCanvas(profileId, projectId, workflowId).then(() => {
    // 4. Mark as loaded after successful load
    useNodeStore.getState().setIsCanvasLoaded(true);
  });
  
  // Cleanup on unmount or workflow change
  return () => {
    useNodeStore.getState().clearDebouncedSave();
  };
}, [workflowId, profileId, projectId]);
```

#### Prevent Initial Save After Load

```typescript
// In debouncedSaveCanvas, add guard:
debouncedSaveCanvas: () => {
  const { isCanvasLoaded } = get();
  if (!isCanvasLoaded) return; // Don't save until initial load complete
  
  // ... rest of implementation
},
```

### PouchDB Document Structure

```typescript
// Stored as document _id = "canvas:{workflowId}"
interface CanvasDocument extends LedgyDocument {
  type: 'canvas';
  profileId: string;
  projectId: string;
  workflowId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  schemaVersion: number; // Start at 1, increment on breaking changes
}
```

### Previous Story Learnings (from 4.2)

**Critical bugs fixed in 4.2 that must NOT regress:**

1. **LoadedRef Reset Race Condition**: When `workflowId` changes, `loadedRef` must reset BEFORE the new canvas loads. Apply same pattern to debounce cleanup.

2. **useShallow Source**: Import `useShallow` from `@xyflow/react`, NOT `zustand`. Pattern for store subscriptions:
   ```typescript
   const nodes = useNodeStore(s => s.nodes, useShallow);
   ```

3. **WorkflowId in Debounce Closure**: Capture `workflowId` in a ref to prevent cross-workflow saves:
   ```typescript
   const workflowIdRef = useRef(workflowId);
   useEffect(() => { workflowIdRef.current = workflowId; }, [workflowId]);
   ```

4. **Abort Mechanism**: Add `loadAbortRef` to cancel pending `loadCanvas` promises when workflow changes. Similar mechanism for debounce cleanup.

5. **Stale Closure Prevention**: Read fresh state inside callbacks rather than relying on closure-captured values.

6. **Error State Management**: Always set store error state AND dispatch to `useErrorStore`:
   ```typescript
   set({ error: errorMsg });
   useErrorStore.getState().dispatchError(errorMsg);
   ```

### Testing Requirements

| Test Scenario | Expected Behavior |
|--------------|-------------------|
| Rapid node drag (5 moves in 2 seconds) | Only 1 save after 1 second of inactivity |
| Workflow switch during pending save | Debounce cleared BEFORE load, no save to old workflow |
| Viewport pan/zoom | Save triggered 1 second after pan/zoom stops |
| New edge connection | Save triggered after connection completes |
| PouchDB failure | Error dispatched, 3 automatic retries with backoff, then manual retry option |
| Unmount during pending save | Debounce cleared, no memory leak |
| Batch delete 10 nodes | ONE debounced save (not 10) |
| Tab hidden | Immediate save triggered, debounce cleared |
| Concurrent tab modification | Conflict detected, canvas refreshes from DB |
| Load canvas | NO immediate re-save triggered (isCanvasLoaded guard) |

### Visual Feedback Requirements

User must know auto-save status:

- **Idle**: No indicator (clean state)
- **Debouncing** (0-1s after change): "Saving..." micro-indicator (subtle, non-blocking)
- **Save in progress**: Spinner or "Saving..." text
- **Save successful**: Brief "Saved" confirmation (2 seconds, then fade)
- **Save failed**: Red error indicator with "Retry" button

### Performance Guardrails

- **Module-level timer**: Store timeout ID in module-level variable (not React state, not Zustand state) to avoid ALL re-renders
- **Shallow equality**: Use `useShallow` for node/edge subscriptions to prevent excessive re-renders
- **1-second debounce**: Hard requirement from epic definition — balances UX and performance
- **No save during drag**: Only `onNodeDragStop` triggers, not `onNodeDrag`
- **Batch handling**: React Flow batches multiple node changes into single callback - verify ONE save per batch

### Error Scenarios to Handle

| Error | Cause | Behavior |
|-------|-------|----------|
| PouchDB put failure | DB locked, quota exceeded | Retry 3x with backoff, then show error |
| Conflict (409) | Concurrent modification | Refresh from DB, notify user |
| DataCloneError | Circular reference in node data | Catch, log, sanitize data |
| QuotaExceededError | Storage full | Show persistent error, suggest cleanup |
| Network timeout | Sync in progress | Retry logic handles automatically |

### File Structure

```
src/
├── stores/
│   ├── useNodeStore.ts          # Add debouncedSaveCanvas, clearDebouncedSave, retry logic
│   └── useNodeStore.test.ts     # Add debounce, retry, regression tests
├── features/nodeEditor/
│   ├── NodeCanvas.tsx           # Wire handlers with validation
│   └── NodeCanvas.test.tsx      # Add integration tests
├── lib/
│   └── db.ts                    # Verify save_canvas/load_canvas
└── components/
    └── ui/
        └── SaveStatus.tsx       # Visual save indicator (optional, can be inline)
```

### Dependencies

- `@xyflow/react` v12 — React Flow components and hooks
- `zustand` — State management with `subscribeWithSelector`
- `pouchdb` — Local persistence

### Out of Scope

- **Conflict resolution UI**: PouchDB revision conflict resolution UI handled in Epic 6
- **Encryption**: Canvas encryption deferred to Epic 6 if needed
- **Undo/redo**: Separate story 3.15 for undo/redo stack (note: auto-save creates implicit checkpoints)
- **Real-time sync**: Sync layer handled in Epic 6
- **Multi-user collaboration**: Single-user only for this story

### Known Limitations

- **Undo/Auto-save tension**: Each successful save creates a checkpoint. Users cannot undo past saved states without explicit undo feature (story 3.15).
- **Tab close data loss**: If user closes tab within 1 second of last change AND before `beforeunload` handler fires, that change may be lost. Mitigated by `beforeunload` but not 100% guaranteed.

### References

- [Source: docs/project-context.md] — Project patterns and conventions
- [Source: _bmad-output/planning-artifacts/epics.md#epic-4] — Epic 4 definition
- [Source: _bmad-output/planning-artifacts/architecture.md] — Architecture decisions
- [Source: _bmad-output/implementation-artifacts/4-2-react-flow-canvas-core-viewport.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

**Next Steps:**
1. Review this story file for completeness
2. Run `skill bmad dev-story` to implement
3. Run `skill bmad code-review` when complete
