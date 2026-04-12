# Story 4.23: Node Forge Integration Test Suite (Execution Pipeline E2E)

Status: backlog

<!--
Story Context: Dedicated integration test story for the full Node Forge execution pipeline.
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: Stories 4.13–4.15 (trigger system) are safety-critical. Autonomous writes to PouchDB
triggered by graph execution require full-pipeline integration tests that unit tests cannot cover.
Murat (Test Architect) flagged: each story has unit tests but zero cross-story integration harness exists.
-->

## Story

As the development team,
I want a comprehensive integration test suite that validates the full Node Forge execution pipeline end-to-end,
so that the autonomous trigger system can be safely shipped knowing that cycles, depth limits, and data integrity are verified across the complete story chain.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium-High (requires full PouchDB test harness, event bus, and multi-story component integration)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] Full pipeline test: Ledger Source → Operator Nodes → Result Output passes
- [ ] Trigger pipeline test: On-Create trigger → DAG traversal → Action Node writes to PouchDB
- [ ] Cyclic trigger recursion test: depth limiter (4.15) halts execution at 100 hops
- [ ] Cross-branch isolation test: logic gate inactive branch does not pollute active branch
- [ ] Error containment test: errored node does not block unrelated parallel branches
- [ ] Performance benchmark: 100-node graph evaluates in <500ms
- [ ] No regressions in existing test suites
- [ ] Code review completed and approved by Tech Lead
- [ ] All integration tests pass in CI (GitHub Actions)
- [ ] Zero flaky tests (retry count = 0 for all tests in this suite)
- [ ] Zero TypeScript compilation errors (strict mode)

## Prerequisites

- **Stories 4-5, 4-6, 4-18 through 4-22** — ALL must be complete or in-review.
- **Story 4-12 (Cyclic Dependency Prevention)** — MUST be complete for recursion tests.
- **Story 4-13, 4-14, 4-15 (Trigger System)** — MUST be complete for trigger pipeline tests.
- **Story 3-1 (PouchDB Document Adapters)** — test harness builds on the existing adapter patterns.

## Acceptance Criteria

### AC1: Test Infrastructure Setup

**Given** the integration test suite needs to run in isolation  
**When** each test file runs  
**Then**:

- In-memory PouchDB instance (not IndexedDB) used for all integration tests
- `buildTestGraph(nodes, edges)` factory utility creates a fully wired `ComputedGraph` in 1 call
- `createTestLedgerWithEntries(schema, entries)` factory seeds PouchDB with test data
- `executeGraphSync(graph)` test utility runs the execution runtime synchronously (no debounce)
- All test DBs destroyed in `afterEach` to prevent cross-test contamination
- Test factory utilities in `src/features/nodeEditor/__tests__/testUtils.ts`

### AC2: Full Computation Pipeline Test

**Given** a graph: LedgerSource → Arithmetic (Add) → ResultOutput  
**When** `executeGraph()` is called with ledger entries providing `[5, 3]` as inputs  
**Then**:

```typescript
// Test: end-to-end value flow
const { outputs } = await executeTestGraph({
  nodes: [ledgerSourceA, arithmeticAdd, resultOutput],
  edges: [sourceA_to_addA, sourceB_to_addB, add_to_output],
});
expect(outputs.get('my_result')).toBe(8);
```

- Value flows correctly through all 3 node types
- `ResultOutput.workflowOutputs` contains `{ my_result: 8 }`
- `nodeOutputs` Map in store reflects intermediate values at each node

### AC3: Trigger → Action Pipeline Test

**Given** a graph: TriggerNode (on-create) → Logic Gate → Action Node (write-entry)  
**When** a new PouchDB entry is created in the watched ledger  
**Then**:

```typescript
// Test: autonomous execution on create event
const ledger = await createTestLedger(schema);
const workflow = buildTriggerWorkflow({
  trigger: { type: 'on-create', ledgerId: ledger.id },
  gate: { type: 'compare', op: '>', threshold: 10 },
  action: { type: 'write-entry', targetLedgerId: resultLedger.id }
});

await createEntry(ledger, { amount: 15 }); // triggers the workflow
await waitForExecution();

const resultEntries = await listEntries(resultLedger);
expect(resultEntries).toHaveLength(1);
expect(resultEntries[0].source_amount).toBe(15);
```

- Trigger fires exactly once per PouchDB change event
- Logic gate correctly routes execution (amount 15 > 10 → true branch)
- Action node writes the correct entry to the target ledger
- Test confirms the entry exists in PouchDB (not just in memory)

### AC4: Recursive Trigger Depth Limiter Test

**Given** a workflow where Action Node writes to a ledger that fires the same Trigger Node  
**When** the first trigger fires  
**Then**:

- Execution proceeds for the first hop
- Depth counter increments correctly on each recursive trigger
- At hop 100, `TriggerExecutionDepthLimiter` (4.15) halts execution
- A `DepthLimitExceededError` is dispatched to `useErrorStore`
- No entries beyond the depth limit are written to PouchDB
- The recursion does not crash the process or hang the event loop

### AC5: Logic Gate Branch Isolation Test

**Given** an IfElse node with `condition = false`  
**When** the graph evaluates  
**Then**:

- `trueBranch` edge carries `null` to downstream nodes
- `falseBranch` edge carries the `value` input correctly
- Nodes connected to the inactive `trueBranch` receive `null` and short-circuit gracefully
- Nodes on the active `falseBranch` compute correct results
- The inactive branch's downstream Result Output node stores `null` (not stale data from a prior run)

### AC6: Error Containment (Partial Execution) Test

**Given** a graph with two parallel branches: Branch A (valid) and Branch B (throws an error)  
**When** the graph evaluates  
**Then**:

- Branch B's errored node is marked with `status: 'error'`
- Branch A continues to evaluate and completes successfully
- `workflowOutputs` contains the valid output from Branch A
- Branch B's `ResultOutput` node stores `null` (not the prior run's value)
- The overall `executionStatus` is `'partial'` (not `'complete'` or `'error'`)

### AC7: Performance Benchmark

**Given** a synthetic 100-node linear chain graph (each node adds 1 to its input)  
**When** `executeGraph()` is called  
**Then**:

- Execution completes in <500ms on the test runner machine
- Memory allocated during execution is released after the test (no retained closures)
- This test is marked `@benchmark` and runs only in CI (not in watch mode)

## Tasks / Subtasks

- [ ] Task 1 — Build test infrastructure in `src/features/nodeEditor/__tests__/testUtils.ts`
  - [ ] 1.1 In-memory PouchDB factory with `afterEach` cleanup
  - [ ] 1.2 `buildTestGraph(nodes, edges)` → `ComputedGraph`
  - [ ] 1.3 `createTestLedgerWithEntries(schema, entries)` → seeded PouchDB ledger
  - [ ] 1.4 `executeGraphSync()` wrapper (bypasses debounce)
  - [ ] 1.5 `waitForExecution()` — polls until `executionStatus !== 'running'`

- [ ] Task 2 — Write pipeline tests in `src/features/nodeEditor/__tests__/execution.integration.test.ts`
  - [ ] 2.1 Full computation pipeline (AC2)
  - [ ] 2.2 Error containment / partial execution (AC6)
  - [ ] 2.3 Performance benchmark (AC7)

- [ ] Task 3 — Write trigger system tests in `src/features/nodeEditor/__tests__/trigger.integration.test.ts`
  - [ ] 3.1 Trigger → Action pipeline (AC3)
  - [ ] 3.2 Recursive depth limiter (AC4)

- [ ] Task 4 — Write logic gate tests in `src/features/nodeEditor/__tests__/logicGate.integration.test.ts`
  - [ ] 4.1 Branch isolation (AC5)
  - [ ] 4.2 AND/OR/NOT chains with Compare nodes

- [ ] Task 5 — CI configuration
  - [ ] 5.1 Add integration test step to GitHub Actions workflow (separate from unit tests)
  - [ ] 5.2 Confirm zero-retry policy enforced for all integration tests
  - [ ] 5.3 Benchmark test gated behind `RUN_BENCHMARKS=true` env var (not in default PR check)
