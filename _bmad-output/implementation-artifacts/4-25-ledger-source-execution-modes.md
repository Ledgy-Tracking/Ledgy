# Story 4.25: Ledger Source Execution Modes (Event-Driven Triggers)

Status: backlog

<!--
Story Context: Amends story 4.5 (Ledger Source Node) to add an executionMode config property.
Based on: Party Mode discussion 2026-04-13 — James raised that a Ledger Source should be able to
act as both the trigger AND the data provider for event-driven workflows, rather than requiring
a separate TriggerNode (4.13) for ledger-based events.

Design decision: Architecture B — execution mode is a property of the Ledger Source Node itself.
This simplifies the user mental model: one node = one event source + one data provider.
Impact on 4.13: rescopes Autonomous Trigger Nodes to non-ledger triggers only (schedules, app startup).
Impact on 4.18: execution runtime must treat event-mode Ledger Source nodes as graph entry points.
Impact on 4.10: hydration hooks must emit per-event deltas, not just snapshot refreshes.

Backward compatible: default mode is 'batch', which preserves all existing 4.5 behavior.
-->

## Story

As a Node Forge user,
I want to configure a Ledger Source node with an execution mode (Always, On Create, On Update, On Delete),
so that the node acts as both the event trigger and the data provider for my workflow — firing the graph when the chosen event occurs and delivering that specific entry's field values downstream.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium-High (PouchDB changes feed integration, dual port mode — batch arrays vs. scalar event data, execution runtime entry-point concept)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `executionMode` config property added to `LedgerSourceNode`: `'batch' | 'on-create' | 'on-update' | 'on-delete' | 'on-any-change'`
- [ ] Default mode `batch` preserves all existing 4.5 behavior (no regression)
- [ ] Event modes (`on-create`, `on-update`, `on-delete`, `on-any-change`) subscribe to PouchDB changes feed
- [ ] Event mode nodes expose **scalar** output handles (e.g., `hours: number`) instead of batch array handles (`hours_array: number[]`)
- [ ] On-delete mode correctly delivers the deleted entry's last-known field values (from PouchDB changes feed `include_docs: true`)
- [ ] Execution runtime (4.18) treats event-mode Ledger Source nodes as graph entry points
- [ ] Switching execution mode on an existing node disconnects incompatible edges (type mismatch between array and scalar) with user confirmation
- [ ] Visual indicator on canvas distinguishes event-mode nodes from batch-mode nodes
- [ ] No regressions in existing batch-mode behavior (stories 4.5, 4.6, 4.10 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: mode switching 90%, changes feed subscription 90%, on-delete data delivery 90%
- [ ] Integration tests: on-create fires graph; on-delete delivers pre-deletion values; mode switch disconnects incompatible edges
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-5 (Ledger Source Node)** — MUST be complete. This story amends 4.5's behavior.
- **Story 4-10 (Graph PouchDB Hydration Hooks)** — MUST be complete. Changes feed subscription pattern established here.
- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete. Graph entry-point model required.
- **Story 4-8 (Strict Edge Type Validation)** — MUST be complete. Edge disconnection on mode switch depends on type validation.

## Acceptance Criteria

### AC1: Execution Mode Configuration

**Given** the user opens a Ledger Source node's inspector panel  
**When** they view the configuration options  
**Then** an "Execution Mode" selector is present:

| Mode | Label | Behavior |
|------|-------|----------|
| `batch` | **Always** (default) | Returns arrays of all current entries; graph re-evaluates on any data change. Existing behavior. |
| `on-create` | **On New Item** | Fires when a new entry is created in this ledger; delivers that entry's field values as scalars. |
| `on-update` | **On Item Updated** | Fires when any entry in this ledger is modified; delivers the updated entry's field values as scalars. |
| `on-delete` | **On Item Deleted** | Fires when an entry is deleted; delivers the deleted entry's last-known field values as scalars. |
| `on-any-change` | **On Any Change** | Fires on create, update, or delete; delivers the triggering entry's values + a `changeType: string` output. |

**Visual indicator:** Event-mode nodes display a lightning bolt badge (⚡) on the header to signal they are graph entry points.

### AC2: Batch Mode Output Handles (Unchanged from 4.5)

**Given** `executionMode = 'batch'`  
**When** the node renders and the graph evaluates  
**Then** output handles are typed as arrays, matching existing 4.5 behavior:

```typescript
// Example ledger with schema: { hours: number, quality: number, notes: string }
outputs: {
  hours_array:   number[];   // all entry values for 'hours' field
  quality_array: number[];   // all entry values for 'quality' field
  notes_array:   string[];   // all entry values for 'notes' field
}
```

Port colors and labels unchanged. No regression in Correlation node (4.6) connections.

### AC3: Event Mode Output Handles (New)

**Given** `executionMode` is any of `'on-create' | 'on-update' | 'on-delete' | 'on-any-change'`  
**When** the node renders  
**Then** output handles switch to scalar types reflecting the triggering entry's fields:

```typescript
// Same ledger schema: { hours: number, quality: number, notes: string }
outputs: {
  hours:       number;    // scalar value from the triggering entry
  quality:     number;    // scalar value from the triggering entry
  notes:       string;    // scalar value from the triggering entry
  entryId:     string;    // ID of the triggering entry (always present in event modes)
  changeType?: string;    // only present in 'on-any-change' mode: 'create' | 'update' | 'delete'
}
```

Handle labels: no `_array` suffix; same field names as the schema field names.

### AC4: PouchDB Changes Feed Subscription

**Given** the node is in an event mode  
**When** the node mounts or its configuration changes  
**Then**:

- Node subscribes to PouchDB `changes` feed filtered to the selected ledger's `projectId` and `type: 'entry'`
- Uses `include_docs: true` and `since: 'now'` (only react to new events, not historical ones)
- On `'on-delete'` mode: the document is marked `isDeleted: true` in the changes feed — the full document body (with field values) is delivered via `include_docs: true` *before* the deletion flag
- When the node unmounts, the changes feed subscription is cancelled (no memory leak)
- At most one active changes feed subscription per event-mode Ledger Source node

**Changes feed event → execution trigger flow:**
1. PouchDB fires a change event matching the configured `executionMode`
2. Node's evaluator populates its scalar outputs with the triggering entry's field values
3. Node signals to the execution runtime (4.18): "start graph execution from this node"
4. Runtime traverses the DAG downstream from this entry point
5. After execution completes, the node clears its temporary scalar outputs (ready for the next event)

### AC5: Execution Runtime Integration (Entry Points)

**Given** a workflow graph contains one or more event-mode Ledger Source nodes  
**When** the execution runtime (4.18) initializes  
**Then** it identifies all event-mode nodes as **graph entry points** (not passive sources):

```typescript
interface ComputedGraph {
  // ... existing fields
  entryPoints: string[];  // nodeIds of event-mode Ledger Source nodes
}
```

- Entry-point nodes are excluded from reactive batch re-evaluation
- They only execute when their PouchDB changes subscription fires
- Non-entry-point nodes downstream of an entry point evaluate normally from the entry point's scalar outputs
- A graph can have both entry-point nodes and batch-mode source nodes coexisting

### AC6: Mode Switching — Edge Disconnection

**Given** a Ledger Source node has existing wired connections (e.g., `hours_array` → Correlation node)  
**When** the user switches `executionMode` from `batch` to any event mode  
**Then**:

- A confirmation dialog appears: *"Switching to event mode will disconnect {N} edge(s) because array outputs are replaced by scalar outputs. Continue?"*
- On confirm: all existing connections from this node are disconnected; new scalar handles are applied
- On cancel: mode selection reverts to the previous value
- Reverse (event → batch) triggers the same dialog and disconnects scalar connections

### AC7: Visual Design — Event Mode Indicator

**Given** a Ledger Source node is in any event mode  
**When** it renders on canvas  
**Then**:

- A ⚡ lightning bolt badge appears in the top-right corner of the node header (emerald-300)
- The mode label is shown in the node body below the ledger name: e.g., *"⚡ On New Item"*
- When the node is "hot" (event has just fired and graph is executing): header pulses amber for 1 second
- In `batch` mode: no badge, no pulse — purely passive appearance

## Tasks / Subtasks

- [ ] Task 1 — Extend `LedgerSourceNodeData` type in `src/types/nodeEditor.ts`
  - [ ] 1.1 Add `executionMode: 'batch' | 'on-create' | 'on-update' | 'on-delete' | 'on-any-change'` (default `'batch'`)
  - [ ] 1.2 Add `lastEventEntryId: string | null` and `lastEventChangeType: string | null` (transient state, not persisted)

- [ ] Task 2 — Extend `useLedgerSourceData` hook for event mode
  - [ ] 2.1 Branch on `executionMode`: if `batch`, existing behavior unchanged
  - [ ] 2.2 If event mode: open PouchDB `changes` feed with `include_docs: true`, `since: 'now'`, filtered to ledger entries
  - [ ] 2.3 Filter change events by type: `on-create` only reacts to non-deleted new docs; `on-update` reacts to modified existing; `on-delete` reacts to `isDeleted: true`
  - [ ] 2.4 For `on-delete`: capture full document body from change event (available via `include_docs`) before deletion flag
  - [ ] 2.5 `useEffect` cleanup: call `changes.cancel()` on unmount / mode change

- [ ] Task 3 — Extend `LedgerSourceNode.evaluator.ts` for scalar output mode
  - [ ] 3.1 If `batch`: existing array output logic unchanged
  - [ ] 3.2 If event mode: populate scalar outputs from `lastEventEntry` fields + `entryId` + optional `changeType`
  - [ ] 3.3 Signal execution runtime entry point trigger (calls `triggerGraphFromEntryPoint(nodeId)` on store)

- [ ] Task 4 — Update `LedgerSourceNode.tsx` component
  - [ ] 4.1 Execution mode selector in inspector panel (radio group or dropdown)
  - [ ] 4.2 Conditional handle rendering: array handles in batch mode, scalar handles in event modes
  - [ ] 4.3 Lightning bolt badge + mode label in event modes
  - [ ] 4.4 Pulse animation when last event fired (derive from `lastEventEntryId` change)
  - [ ] 4.5 Mode switch confirmation dialog (AC6)

- [ ] Task 5 — Extend `ComputedGraph` and execution runtime in 4.18
  - [ ] 5.1 Add `entryPoints: string[]` to `ComputedGraph` type
  - [ ] 5.2 Populate `entryPoints` during `buildComputedGraph()` by detecting event-mode Ledger Source nodes
  - [ ] 5.3 Add `triggerGraphFromEntryPoint(nodeId)` action to `useNodeStore`: starts graph execution from a specific entry point node (vs. full graph re-evaluation)
  - [ ] 5.4 Exclude entry-point nodes from reactive batch evaluation cycle

- [ ] Task 6 — Unit + integration tests
  - [ ] 6.1 Mode switching triggers edge disconnection dialog
  - [ ] 6.2 `on-create`: PouchDB insert fires graph; scalar outputs populated with new entry's values
  - [ ] 6.3 `on-update`: PouchDB update fires graph; scalar outputs show updated values
  - [ ] 6.4 `on-delete`: graph fires with last-known values before deletion
  - [ ] 6.5 `on-any-change`: fires for all three; `changeType` output set correctly
  - [ ] 6.6 Changes feed subscription cancelled on node unmount (no listener leak)
  - [ ] 6.7 Batch mode: zero regression against 4.5 + 4.6 integration
