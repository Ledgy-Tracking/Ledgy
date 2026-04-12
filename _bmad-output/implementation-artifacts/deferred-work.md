# Deferred Work

## Deferred from: code review of 3-15-local-undo-redo-stack (2026-04-04)

- **[D1][High] Backlink reconciliation bypassed during undo/redo of `update`** — `applyMutationsForward/Reverse` call `db.updateDocument` directly, bypassing `reconcileBackLinksForSource`. Relation target documents keep stale backlinks after undo/redo of an update that modified relation fields. Requires bundling backlink doc snapshots into the action record or invoking reconcile from the undo/redo path.

- **[D2][High] Undo of `create` doesn't strip outgoing backlinks from relation targets** — `applyMutationsReverse` for `create` only sets `isDeleted: true` on the source entry. Backlink records on relation target documents are not removed. Mirrors what `delete_entry` does via `reconcileBackLinksForSource(nextTargets = new Map())`.

- **[D3][High] Redo of `delete` doesn't run backlink reconciliation** — `applyMutationsForward` writes the snapshot `newState` (with `isDeleted: true`) without stripping outgoing backlinks from target documents.

- **[D4][High] Bundled mutations not truly atomic** — `applyMutationsForward/Reverse` loop over mutations with sequential `await db.updateDocument()` calls and no per-mutation rollback. A mid-loop failure partially writes to the DB while the action is not removed from the undo/redo stack; subsequent retry re-applies the already-written mutations.

- **[D5][Med] Race condition: concurrent async undo keypresses can double-apply the same action** — the `handle` function in `useUndoRedoShortcuts` is async and not debounced/guarded. Two rapid Ctrl+Z presses can both snapshot the same top-of-stack action before either removes it.

- **[D6][Med] `fetchEntries` unconditionally called after conflict** — on a PouchDB 409 conflict, `undoAction` dispatches an error toast and returns. The shortcut hook then calls `fetchEntries` regardless, which can dispatch its own error and overwrite the conflict toast.

- **[D7][Med] `activeSchemaId` stale after async undo during ledger switch** — `activeSchemaId` is read after `await undoRedo.undoAction(...)` resolves in the hook. If the user switched ledgers during the await, `fetchEntries` is called for the new (wrong) ledger; the undo result is invisible until the user manually switches back.

- **[D8][Med] Integration test async-leak hazard** — `afterEach` calls `db.destroy()` which removes the profile from the `profileDatabases` cache. If any async operation from the prior test resolves after `afterEach` (e.g. JIT migration write-back), it calls `getProfileDb` on a destroyed profile and creates a fresh empty DB. Low practical risk given unique profileIds per test.

- **[D9][Low] `applyMutationsReverse` for `delete` bypasses schema validation** — restoring an old snapshot via `db.updateDocument` skips `validateEntryAgainstSchema`. If the schema added required fields after the entry was deleted, the restored document may not satisfy the current schema.

- **[D10][Low] Unhandled non-conflict error in `useUndoRedoShortcuts`** — if `undoAction/redoAction` re-throws a non-409 error, `fetchEntries` is skipped and the rejection propagates to the window event handler, silently swallowed by the browser with no user feedback.

## Deferred from: code review of 3-16-relational-data-flattening-engine (2026-04-07)

- **[D11][High] Cross-ledger entries silently show as `[Deleted]` when target ledger's entries are not loaded** — `allEntries` in `useLedgerStore` is only populated per explicit `fetchEntries` call. If a relation field points to a ledger whose entries haven't been loaded, `allEntriesByLedgerId[targetLedgerId]` returns `[]` and every target appears as `[Deleted]` with no user-facing indication. Needs a loading guard or cross-ledger prefetch strategy. (`src/lib/flattenRelations.ts`, `src/features/ledger/LedgerTable.tsx`)

## Deferred from: code review of 4-1-react-flow-canvas-core-viewport (2026-04-08)

- **[D12][Med] Error state set but never cleared after successful saves** — `useNodeStore.saveCanvas` sets `{ error: errorMsg }` on failure, but no subsequent operation clears it. Successful saves do not reset error to null, so a stale error persists until `clearProfileData` is called. Consider clearing error on successful save or on loadCanvas start. (`src/stores/useNodeStore.ts`)

- **[W1][Med] `handleAddFirstNode` positions node in screen pixels, not viewport-space coordinates** — `window.innerWidth/2 - 100` is not corrected for pan/zoom; node appears off-center at non-default viewports. (`src/features/nodeEditor/NodeCanvas.tsx:148`)

- **[W2][Med] `saveCanvas` catch block never updates `state.error`** — errors are dispatched to `useErrorStore` but `useNodeStore.error` stays null, inconsistent with `loadCanvas` which does set `state.error`. (`src/stores/useNodeStore.ts`)

- **[W3][Med] `save_canvas` has no PouchDB revision/conflict handling** — two concurrent tab sessions can both call `save_canvas` within the debounce window and the second write silently overwrites the first with no conflict detection. (`src/lib/db.ts`)

- **[W4][Med] Store `onNodesChange`/`onEdgesChange` defined but never wired to `<ReactFlow>`** — `NodeCanvas` uses `useNodesState`'s handlers, not the store's. The store's `nodes` diverges from React Flow local state after any drag/select, breaking any store-driven subscriber or `updateNodeData` call. (`src/stores/useNodeStore.ts`, `src/features/nodeEditor/NodeCanvas.tsx`)

- **[W5][Low] `Date.now()`-based node ID not collision-resistant** — rapid programmatic adds within the same millisecond produce duplicate IDs; React Flow silently discards or merges duplicate nodes. (`src/features/nodeEditor/NodeCanvas.tsx:149`)

- **[W6][Low] Auth-lock asymmetry: `loadCanvas` throws on locked vault, `saveCanvas` silently no-ops** — a mid-session vault lock causes saves to silently discard with no user feedback. (`src/stores/useNodeStore.ts`)

## Deferred from: code review of 4-1-workflow-script-list-and-management (2026-04-11)

- **[D1][Low] `list_workflows` loads all workflow docs across all projects then filters in-memory** — `queryDocuments({ type: 'workflow', includeDeleted: false })` returns every non-deleted workflow for the profile, then JS `.filter(doc.projectId === projectId)` narrows it. Grows unbounded with many projects. Acceptable at MVP scale; would require a dedicated index or keyed query to fix. (`src/lib/db.ts`)

- **[D2][Low] Optimistic `updatedAt` in `renameWorkflow` is slightly stale vs the DB value** — the store patches the in-memory record with `new Date().toISOString()` before `updateDocument` writes its own timestamp. Drift is negligible (milliseconds in the same call chain). Technically the sort order after a rename could briefly be wrong if two renames happen simultaneously. (`src/stores/useWorkflowStore.ts`)

- **[D3][Low] `fetchWorkflows` `useEffect` has no AbortController / cleanup** — if the component unmounts while the PouchDB query is in-flight, `set({ workflows, isLoading: false })` still fires on the store. No crash in Zustand, but stale data briefly populates the store. Pre-existing pattern across all stores; needs a broader cleanup strategy. (`src/features/nodeEditor/WorkflowScriptList.tsx`)

## Deferred from: code review of 4-2-react-flow-canvas-core-viewport (2026-04-11)

- **[D13][Med] `useShallow` import source verification** — zustand/shallow vs @xyflow/react may have different APIs/behaviors. Need to verify zustand/shallow is correct replacement for @xyflow/react's useShallow. (`src/features/nodeEditor/NodeCanvas.tsx`)

- **[D14][Med] Shallow subscription selector instability** — `useNodeStore(useShallow(s => s.nodes))` creates a new selector function on every render, defeating Zustand's selector stability optimizations and potentially causing excessive re-renders. (`src/features/nodeEditor/NodeCanvas.tsx`)


## Deferred from: code review of 4-3-node-store-debounced-persistence (2026-04-11)

- Accessibility Learnings Removed — .Jules/palette.md changes removed accessibility content. This is a documentation change, not a code defect introduced by this PR.
- Type Safety Theater — Generic <T> with immediate cast to any is a pre-existing pattern in the codebase, not introduced by this change.
- Silent Timestamp Overwrite — Relies on existing.createdAt persisting. Pre-existing data pattern issue.
- JSDoc Misleading — Documentation gaps are real but not code defects.
- Return Value Documentation — Missing docs don't block functionality.

## Deferred from: code review of 4-4-minimap-zoom-to-fit-controls (2026-04-12)

- Module-level event listeners not cleaned up — Event listeners registered at module level persist for app lifetime. Pre-existing pattern in codebase (useNodeStore.ts:389-392).
- NodeInspector theme violations — Pre-existing hardcoded text-white in components/Inspector/NodeInspector.tsx (not modified in this PR).

## Deferred from: code review of 4-5-ledger-source-node-component and 4-6-correlation-node-math-component (2026-04-12)

- **[D1][Med] Field ID Immutability Not Enforced at Schema Level** — The LedgerSourceNode uses field IDs for handle stability, but the schema builder doesn't enforce immutable field IDs. Renaming a field in the schema builder currently creates a new field ID in some cases, but this is inconsistent. Requires schema builder architecture changes. (`src/stores/useSchemaBuilderStore.ts`)

- **[D2][Med] Incomplete Canvas Load Error Recovery** — When `loadCanvas` fails, the store sets `isCanvasLoaded: false` but doesn't clear partially loaded `nodes`, `edges`, and `viewport`. UI displays stale/corrupted data. Pre-existing store behavior not introduced by these stories. (`src/stores/useNodeStore.ts`)

- **[D3][Low] LedgerSourceNode Re-renders on Every Entry Change** — Every field output component receives full `entries` array and re-renders when any entry changes, even fields that don't need entry data. Could optimize with field-specific memoization, but acceptable performance for MVP. (`src/features/nodeEditor/nodes/LedgerSourceNode.tsx`)

- **[D4][Low] Batch Decryption Not Bounded** — `useLedgerSourceData` decrypts all entries with `Promise.all()` without batching. For ledgers with 100+ entries, this could cause memory pressure. Pre-existing pattern from earlier stories. (`src/features/nodeEditor/hooks/useLedgerSourceData.ts`)

## Deferred from: code review of 4-7-complex-edge-connection-snapping (2026-04-12)

- **[D1][Med] DOM Query Performance on 100+ Nodes** — `querySelectorAll` + `getBoundingClientRect()` for every node on viewport change causes layout thrashing. Pre-existing React Flow integration pattern, optimization opportunity not blocking. (`src/features/nodeEditor/hooks/useHandlePositions.ts:53-82`)

- **[D2][Med] Quadtree Unbounded Growth** — `HandleSpatialIndex` has insert but no remove/clear. In long-running apps with dynamic nodes, memory grows without bound. Architecture improvement for future enhancement. (`src/features/nodeEditor/utils/snapDetection.ts:47-202`)

- **[D3][Low] Hardcoded Node Type Strings** — String literals for node types ('ledgerSource', 'correlation', 'arithmetic') scattered throughout. Pre-existing codebase pattern, type safety improvement. (`src/features/nodeEditor/utils/portTypeUtils.ts:44-80`)

- **[D4][Low] RAF Anti-Pattern** — Cancels and re-schedules RAF on every mouse move instead of letting it run. Pre-existing performance optimization opportunity, acceptable for MVP. (`src/features/nodeEditor/hooks/useEdgeDrag.ts:85-134`)

- **[D5][Low] Infinite Animation Performance** — pulse-glow animation runs continuously while valid. Visual polish, not functional defect. CSS animation should not impact 60fps target. (`src/features/nodeEditor/components/ConnectionLine.tsx:117-131`)

## Deferred from: code review of 4-8-strict-edge-type-validation (2026-04-12)

- **[D1][Low] nodes.find() O(n) in hot path** — `getPortTypeFromHandle` uses `nodes.find()` for every validation. Acceptable for current node counts (<100), but could become a bottleneck with larger graphs. Consider Map-based lookup if performance issues arise. (`src/features/nodeEditor/utils/getPortTypeFromHandle.ts:19-20`)

- **[D2][Low] console.warn in production** — `validateGraphEdges` logs warnings to console. Acceptable for validation debugging, but should migrate to proper logging system in production. (`src/features/nodeEditor/utils/edgeValidation.ts:26-28`)

- **[D3][Low] Incomplete Schema Change Handling** — Schema change listeners and field deletion edge cleanup marked as deferred in story AC5. Placeholder not implemented yet. Future enhancement when schema change events are wired up. (`src/features/nodeEditor/utils/edgeValidation.ts`)
