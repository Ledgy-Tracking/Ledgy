# Story 4.18: Node Graph Execution Runtime (DAG Traversal Engine)

Status: backlog

<!--
Story Context: Critical missing infrastructure story — the execution engine that evaluates nodes in topological order and propagates values through connections.
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: FR22, FR27, FR28 all assume an execution runtime exists; no prior story defines it.
Dependency Note: Stories 4.13, 4.14, 4.15 (trigger system) and 4.19, 4.20 (operator nodes) CANNOT be implemented without this runtime.
-->

## Story

As a Node Forge user,
I want my workflow graph to automatically compute and propagate values through connected nodes whenever inputs change,
so that I can see live results flow through my logic network without manually triggering execution.

**Story Points:** 8 (L) ~5-7 days
**Complexity:** High (DAG algorithms, reactive evaluation, conditional flow routing, cross-story integration foundation)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] Topological sort algorithm correctly orders nodes for evaluation
- [ ] Value propagation passes outputs from upstream nodes to downstream inputs before evaluation
- [ ] Reactive re-evaluation triggers when any connected Ledger Source node data changes
- [ ] Conditional edge activation model implemented (required for 4.19 logic gates)
- [ ] Computed graph model (adjacency-list) maintained separately from React Flow render state
- [ ] NodeTypeRegistry replaces all hardcoded node type strings (resolves deferred D3 from 4.7 review)
- [ ] Execution state exposed in useNodeStore: `executionStatus`, `nodeOutputs`, `lastExecutedAt`
- [ ] Error states per-node visible on canvas when a node throws during evaluation
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.17 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: DAG traversal 90%, value propagation 90%, NodeTypeRegistry 85%
- [ ] Integration tests: full pipeline execution with Ledger Source → Arithmetic → Output chain
- [ ] Performance: graph with 100 nodes evaluates in <500ms on main thread
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-5 (Ledger Source Node)** — MUST be complete. Source node must expose typed output values.
- **Story 4-6 (Correlation Node)** — MUST be complete. Arithmetic node must implement `evaluate(inputs) → outputs` interface.
- **Story 4-8 (Strict Edge Type Validation)** — MUST be complete. Edge type system defines valid connections.
- **Story 4-10 (Graph PouchDB Hydration Hooks)** — SHOULD be complete. Hydration hooks feed data into source nodes that the runtime then propagates.

## Acceptance Criteria

### AC1: Computed Graph Model (Adjacency List)

**Given** a React Flow canvas with nodes and edges  
**When** the graph is loaded or edges are modified  
**Then** the execution runtime maintains a separate `ComputedGraph` structure:

```typescript
interface ComputedGraph {
  adjacency: Map<string, string[]>;         // nodeId → downstream nodeIds
  reverseAdj: Map<string, string[]>;        // nodeId → upstream nodeIds
  topologicalOrder: string[];               // nodes in evaluation order
  edgeMap: Map<string, EdgeConnection[]>;   // sourceNodeId:handleId → targets
  isDirty: boolean;                         // rebuild needed
}

interface EdgeConnection {
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}
```

- `ComputedGraph` is rebuilt in <10ms whenever nodes or edges change in `useNodeStore`
- Stored in `useNodeStore` as `computedGraph`, separate from `nodes[]` and `edges[]`
- Cycle detection runs during rebuild; cycles set `isDirty: true` with a cycle error (4.12 enforces prevention upstream, but runtime must be defensive)

### AC2: Node Evaluator Interface

**Given** a node type registered in the NodeTypeRegistry  
**When** the execution runtime evaluates it  
**Then** every node type must implement:

```typescript
interface NodeEvaluator {
  evaluate(
    inputs: Record<string, NodeValue>,
    config: Record<string, unknown>
  ): NodeEvaluationResult;
}

interface NodeEvaluationResult {
  outputs: Record<string, NodeValue>;         // Named output values
  activeOutputHandle?: string;                 // For conditional routing (logic gates)
  error?: string;                              // Null if successful
}

type NodeValue = number | number[] | string | boolean | Date | null;
```

- All existing node types (LedgerSource, Correlation, Arithmetic) are refactored to implement `NodeEvaluator`
- `NodeTypeRegistry` maps node `type` strings to their `NodeEvaluator` implementations
- No hardcoded node type strings in execution code

### AC3: Topological Evaluation Pipeline

**Given** a valid DAG (no cycles)  
**When** `executeGraph()` is called  
**Then** the runtime:

1. Reads `computedGraph.topologicalOrder`
2. For each node in order: collects output values from all upstream neighbors, passes as `inputs` to `evaluate()`
3. Stores result in `nodeOutputs: Map<string, Record<string, NodeValue>>`
4. On `NodeEvaluationResult.error`: marks the node as errored, continues evaluation for unblocked downstream nodes (partial execution)
5. Updates `useNodeStore.executionStatus` to `'idle' | 'running' | 'error' | 'complete'`
6. Updates `useNodeStore.lastExecutedAt` with ISO timestamp

### AC4: Reactive Re-Evaluation

**Given** a Ledger Source node connected to downstream computation nodes  
**When** PouchDB data changes (via 4.10 hydration hooks) update the source node's output values  
**Then**:

- Only nodes downstream of the changed source node are re-evaluated (dirty propagation, not full graph re-execution)
- Re-evaluation is debounced 300ms to batch rapid successive changes
- Canvas does not freeze during re-evaluation; if evaluation exceeds 50ms, execution is deferred to a microtask queue

### AC5: Conditional Edge Activation (Logic Gate Foundation)

**Given** a node's `evaluate()` returns `activeOutputHandle: 'true_branch'`  
**When** the execution runtime propagates values downstream  
**Then**:

- Only edges originating from `activeOutputHandle` carry values to downstream nodes
- Edges from inactive handles deliver `null` to downstream inputs
- This model supports the If/Else branching required by story 4.19

### AC6: Execution State Visualized on Canvas

**Given** a node has errored during execution  
**When** the user views the canvas  
**Then**:

- Errored nodes display a red error badge with the error message in a tooltip
- Successfully computed nodes display their output value(s) in a live preview badge (extends the "live preview" from 4.6)
- Running nodes display a subtle pulse animation during evaluation
- State resets to idle on canvas reload

### AC7: NodeTypeRegistry

**Given** a new node type is being implemented (e.g., 4.19 Logic Gate)  
**When** it is registered  
**Then**:

```typescript
NodeTypeRegistry.register({
  type: 'logicGate',
  displayName: 'Logic Gate',
  category: 'Logic',
  evaluator: LogicGateEvaluator,
  reactFlowComponent: LogicGateNode,
  defaultConfig: { operation: 'AND' },
});
```

- Registry is the single source of truth for all node types
- React Flow's `nodeTypes` map is derived from the registry at app init
- Palette (story 4.24) derives its node list from the registry categories

## Tasks / Subtasks

- [ ] Task 1 — Define core types in `src/features/nodeEditor/types/execution.ts`
  - [ ] 1.1 `ComputedGraph`, `EdgeConnection`, `NodeValue`, `NodeEvaluator`, `NodeEvaluationResult` interfaces
  - [ ] 1.2 Export all from `src/features/nodeEditor/types/index.ts`

- [ ] Task 2 — Implement `NodeTypeRegistry` in `src/features/nodeEditor/registry/NodeTypeRegistry.ts`
  - [ ] 2.1 `register(definition)`, `get(type)`, `getAll()`, `getByCategory()` methods
  - [ ] 2.2 Register existing node types: `ledgerSource`, `correlation`, `arithmetic`
  - [ ] 2.3 Remove all hardcoded node type string literals from existing files (resolves deferred D3 from 4.7)

- [ ] Task 3 — Implement `ComputedGraph` builder in `src/features/nodeEditor/execution/buildComputedGraph.ts`
  - [ ] 3.1 Kahn's algorithm topological sort
  - [ ] 3.2 Cycle detection (returns error if cycle found)
  - [ ] 3.3 Adjacency list + reverse adjacency construction from `edges[]`
  - [ ] 3.4 Unit tests: linear chain, diamond DAG, fork-join, cycle detection

- [ ] Task 4 — Implement execution engine in `src/features/nodeEditor/execution/GraphExecutor.ts`
  - [ ] 4.1 `executeGraph(computedGraph, nodeOutputs, nodeDataMap)` function
  - [ ] 4.2 Conditional edge activation logic (AC5)
  - [ ] 4.3 Partial execution on node error (AC3 step 4)
  - [ ] 4.4 Unit tests: full pipeline, error propagation, conditional routing

- [ ] Task 5 — Wire into `useNodeStore`
  - [ ] 5.1 Add `computedGraph`, `nodeOutputs`, `executionStatus`, `lastExecutedAt` to store state
  - [ ] 5.2 Rebuild `computedGraph` on `onEdgesChange`/`onNodesChange`
  - [ ] 5.3 Trigger `executeGraph` on `computedGraph` rebuild and on hydration hook data changes
  - [ ] 5.4 Implement 300ms debounce on reactive re-evaluation

- [ ] Task 6 — Refactor existing nodes to implement `NodeEvaluator`
  - [ ] 6.1 `LedgerSourceNode` — `evaluate()` returns current field values from store cache
  - [ ] 6.2 `CorrelationNode` — `evaluate()` runs Pearson's r from inputs
  - [ ] 6.3 `ArithmeticNode` — `evaluate()` runs arithmetic op from inputs
  - [ ] 6.4 All nodes register via `NodeTypeRegistry`

- [ ] Task 7 — Canvas execution state visualization (AC6)
  - [ ] 7.1 Error badge component on errored nodes
  - [ ] 7.2 Live output value badge (extend existing preview from 4.6)
  - [ ] 7.3 Running pulse animation

- [ ] Task 8 — Integration tests in `src/features/nodeEditor/__tests__/execution.integration.test.ts`
  - [ ] 8.1 Source → Arithmetic → Output chain
  - [ ] 8.2 Error node doesn't block unrelated downstream branches
  - [ ] 8.3 Reactive update only re-evaluates dirty subgraph
