# Story 4.21: Result Output Node (Node Forge ↔ Dashboard Bridge)

Status: backlog

<!--
Story Context: Terminal "Output" node that stores computed workflow results in named output registries.
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: Epic 5 story 5.5 ("Widget to Node Forge Data Piping") requires subscribable Node Forge outputs.
Without this story, Dashboard widgets have no defined subscription interface to Node Forge results.
FRs covered: FR22 (output side), FR19 (real-time widget updates feed from this).
-->

## Story

As a Node Forge user,
I want to place a named Result Output node at the end of my workflow,
so that the computed value is stored under a stable name that dashboard widgets can subscribe to and display.

**Story Points:** 3 (S-M) ~2-3 days
**Complexity:** Low-Medium (evaluator is trivial; key complexity is the named output registry and subscription interface for Epic 5)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `ResultOutput` node accepts any typed input and stores it in the workflow's named output registry
- [ ] Named output registry persisted to PouchDB as part of the workflow's canvas document
- [ ] `useNodeStore.workflowOutputs` exposes a `Map<outputName, NodeValue>` for external subscribers
- [ ] Dashboard subscription interface (`subscribeToWorkflowOutput`) exported for Epic 5 story 5.5
- [ ] Multiple `ResultOutput` nodes per workflow supported (each with a unique user-defined name)
- [ ] Duplicate output name within the same workflow rejected with an inline validation error
- [ ] Visual design: emerald-400 accent (output/sink, matching source node theme but lighter)
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.20 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: registry write/read 90%, subscription hook 85%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete. `NodeEvaluator` interface and output propagation required.
- **Story 4-3 (Node Store & Debounced Persistence)** — MUST be complete. Output registry must persist to PouchDB with the canvas.

## Acceptance Criteria

### AC1: ResultOutput Node Visual Design

**Given** the user has placed a ResultOutput node  
**When** it renders on the canvas  
**Then**:

```
┌──────────────────────────┐  ← emerald-400 header
│ 📤 Output             ▼  │  ← icon + name field (editable inline)
├──────────────────────────┤
│  ○─[in]    "my_output"   │  ← single input port + name display
│            ──────────    │
│            42.7          │  ← live value preview
└──────────────────────────┘
```

- Header: `Upload` icon, emerald-400 (lighter than source emerald-600 — visually distinct)
- Single input port: accepts any `NodeValue` type (`number`, `string`, `boolean`, `Date`, `null`)
- Output name field: editable inline text input (required, min 1 char, max 48 chars)
- Live value preview: shows current computed value formatted by type
- No output port — this is a terminal/sink node

### AC2: Named Output Registry

**Given** a workflow contains one or more `ResultOutput` nodes  
**When** the execution runtime (4.18) evaluates the graph  
**Then**:

- Each `ResultOutput` node's `evaluate()` writes `{ [outputName]: value }` to `useNodeStore.workflowOutputs`
- `workflowOutputs` is a `Map<string, NodeValue>` keyed by the output's user-defined name
- The registry updates reactively whenever the execution pipeline re-evaluates
- Names are scoped to the workflow — two different workflows can use the same output name without collision

### AC3: Persistence to PouchDB

**Given** a workflow with `ResultOutput` nodes has been evaluated  
**When** the canvas is saved (debounced persistence from 4.3)  
**Then**:

- The canvas document in PouchDB includes an `outputRegistry` field:
```typescript
interface WorkflowScript {
  // existing fields...
  outputRegistry: Record<string, {
    outputName: string;
    nodeId: string;
    lastValue: NodeValue;
    lastComputedAt: string; // ISO timestamp
  }>;
}
```
- On canvas load, `workflowOutputs` is populated from `outputRegistry` (last known values before hydration)

### AC4: Duplicate Name Validation

**Given** a workflow already has a `ResultOutput` node named `"sleep_score"`  
**When** the user tries to name a second `ResultOutput` node `"sleep_score"`  
**Then**:

- The name field shows an inline red error: *"Output name 'sleep_score' is already used in this workflow"*
- The node cannot be connected or executed until the name is changed
- On rename, the duplicate error clears immediately

### AC5: Dashboard Subscription Interface

**Given** Epic 5 story 5.5 needs to subscribe a widget to a Node Forge output  
**When** a dashboard widget calls `subscribeToWorkflowOutput(workflowId, outputName, callback)`  
**Then**:

```typescript
// Exported from src/features/nodeEditor/hooks/useWorkflowOutput.ts
function useWorkflowOutput(
  workflowId: string,
  outputName: string
): { value: NodeValue; lastComputedAt: string | null; isStale: boolean };
```

- Returns the current value from `workflowOutputs` for the named output
- `isStale: true` when the workflow canvas is not currently loaded in memory (returns last persisted value from PouchDB)
- Re-renders the subscribing component when the value changes (Zustand reactive)
- **This hook is the sole interface that Epic 5 story 5.5 consumes — no other Node Forge internals exposed**

## Tasks / Subtasks

- [ ] Task 1 — Define `outputRegistry` field in `WorkflowScript` type in `src/types/nodeEditor.ts`
  - [ ] 1.1 Add `outputRegistry: Record<string, WorkflowOutputEntry>` to `WorkflowScript`
  - [ ] 1.2 Define `WorkflowOutputEntry` interface

- [ ] Task 2 — Implement `ResultOutputNode` evaluator and React Flow component
  - [ ] 2.1 `ResultOutputNode.evaluator.ts` — writes input value to `workflowOutputs` via store action
  - [ ] 2.2 `ResultOutputNode.tsx` — inline name editor, live value preview, single input port
  - [ ] 2.3 Duplicate name validation in component (checks against `useNodeStore.workflowOutputs` keys)
  - [ ] 2.4 Register in `NodeTypeRegistry` under category `'Output'`

- [ ] Task 3 — Extend `useNodeStore` with output registry
  - [ ] 3.1 Add `workflowOutputs: Map<string, NodeValue>` to store state
  - [ ] 3.2 `setWorkflowOutput(name, value)` action called by `ResultOutput` evaluator
  - [ ] 3.3 Load `outputRegistry` from PouchDB into `workflowOutputs` on `loadCanvas`
  - [ ] 3.4 Include `outputRegistry` in `saveCanvas` debounced write

- [ ] Task 4 — Implement `useWorkflowOutput` hook in `src/features/nodeEditor/hooks/useWorkflowOutput.ts`
  - [ ] 4.1 Live subscription from `workflowOutputs` store slice
  - [ ] 4.2 Fallback to PouchDB `outputRegistry` when workflow not loaded in memory (`isStale: true`)
  - [ ] 4.3 Export from `src/features/nodeEditor/index.ts`

- [ ] Task 5 — Unit + integration tests
  - [ ] 5.1 Registry write on evaluation
  - [ ] 5.2 Duplicate name rejection
  - [ ] 5.3 `useWorkflowOutput` hook: live value, stale value fallback
  - [ ] 5.4 Persistence round-trip: save → reload → values restored
