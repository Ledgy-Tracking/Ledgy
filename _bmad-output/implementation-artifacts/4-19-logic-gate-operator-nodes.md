# Story 4.19: Logic Gate Operator Nodes (If/Else, AND/OR, NOT, Compare)

Status: backlog

<!--
Story Context: Covers the logic/boolean half of FR29 — operator nodes for conditional branching.
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: FR29 explicitly lists "logic (If/Else, AND/OR)" — not covered by story 4.6 (arithmetic only).
Critical Dependency: Requires 4.18 (execution runtime) conditional edge activation model (AC5).
-->

## Story

As a Node Forge user,
I want to insert logic gate nodes (If/Else, AND, OR, NOT, Compare) into my workflow,
so that I can build conditional branching logic that routes data or triggers different actions based on evaluated conditions.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium (builds on execution runtime; conditional routing model established in 4.18 AC5)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `IfElse` node routes execution to true or false branch based on boolean input
- [ ] `Compare` node evaluates two values (==, !=, >, <, >=, <=) and outputs a boolean
- [ ] `AND`, `OR`, `NOT` nodes perform boolean logic on boolean inputs
- [ ] All logic nodes implement `NodeEvaluator` interface from 4.18
- [ ] All logic nodes registered in `NodeTypeRegistry` from 4.18
- [ ] Conditional edge activation (inactive branches receive `null`) correctly implemented
- [ ] Edge type system (4.8) updated: `boolean` port type fully validated for logic node connections
- [ ] Visual design: amber accent color scheme for logic nodes (distinct from emerald source nodes, cyan math nodes)
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.18 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: each node evaluator 90%, edge activation routing 85%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete. Conditional edge activation model (AC5) is required for If/Else routing.
- **Story 4-8 (Strict Edge Type Validation)** — MUST be complete. `boolean` port type must be validated.
- **Story 4-6 (Correlation Node)** — MUST be complete. Port type system patterns established.

## Acceptance Criteria

### AC1: Compare Node

**Given** the user has placed a Compare node  
**When** they configure the comparison operator and connect two same-typed inputs  
**Then** the node:

- **Input ports:** `valueA` (number | string | Date | boolean), `valueB` (same type as valueA)
- **Output port:** `result` (boolean)
- **Configuration:** operator selector: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Type enforcement:** both inputs must share the same port type; mismatched connections rejected by 4.8 validation
- **Edge cases:** either input `null` → output `null` with "Insufficient input" tooltip
- **Visual:** Amber-500 header, `Scale` icon, operator selector displayed in node body
- **Data contract:**
```typescript
inputs:  { valueA: NodeValue; valueB: NodeValue; }
config:  { operator: '==' | '!=' | '>' | '<' | '>=' | '<=' }
outputs: { result: boolean | null }
```

### AC2: AND / OR / NOT Nodes

**Given** the user has placed a boolean logic node  
**When** inputs are connected and the graph executes  
**Then**:

**AND Node:**
- Inputs: `a` (boolean), `b` (boolean) — both required
- Output: `result` (boolean) — `true` only when both inputs are `true`
- Short-circuit: if `a` is `false`, output is `false` without evaluating `b`

**OR Node:**
- Inputs: `a` (boolean), `b` (boolean)
- Output: `result` (boolean) — `true` when either input is `true`

**NOT Node:**
- Input: `value` (boolean)
- Output: `result` (boolean) — inverted value
- Single-input node; simpler visual (no two-column port layout)

All three: amber-500 header, gate-appropriate icon (`GitMerge` for AND/OR, `ArrowLeftRight` for NOT)

### AC3: If/Else Node

**Given** the user has placed an If/Else node  
**When** its `condition` input receives a boolean and the graph evaluates  
**Then** the node uses conditional edge activation (4.18 AC5):

- **Input ports:** `condition` (boolean), `value` (any NodeValue — passed through to active branch)
- **Output ports:** `trueBranch` (NodeValue), `falseBranch` (NodeValue)
- **Routing:** `evaluate()` returns `activeOutputHandle: condition ? 'trueBranch' : 'falseBranch'`
- **Inactive branch:** receives `null` from the runtime; downstream nodes on that branch receive `null` as input
- **Visual indicator:** active branch edge glows amber, inactive branch edge is dimmed
- **Data contract:**
```typescript
inputs:  { condition: boolean | null; value: NodeValue; }
outputs: { trueBranch: NodeValue; falseBranch: NodeValue; }
// evaluator sets activeOutputHandle based on condition
```

### AC4: Type Compatibility in Edge Validation

**Given** the user is connecting to/from a logic node port  
**When** 4.8 edge validation runs  
**Then** the type system is extended:

- `boolean` port type added to the port type color coding (amber, distinct from existing types)
- `Compare` output (`boolean`) connects to `AND`/`OR`/`NOT`/`IfElse` condition inputs
- `IfElse` `trueBranch`/`falseBranch` outputs inherit the type of the `value` input dynamically
- Attempting to connect a `number` output to a `boolean` input is rejected with rejection notification

### AC5: Node Palette Registration

**Given** the NodeTypeRegistry is queried for category `'Logic'`  
**When** the node palette (4.24) renders  
**Then** it displays: `Compare`, `AND`, `OR`, `NOT`, `If/Else` — each with icon, name, and one-line description

## Tasks / Subtasks

- [ ] Task 1 — Implement evaluators in `src/features/nodeEditor/nodes/logic/`
  - [ ] 1.1 `CompareNode.evaluator.ts` — comparison logic + null handling
  - [ ] 1.2 `AndNode.evaluator.ts`, `OrNode.evaluator.ts`, `NotNode.evaluator.ts`
  - [ ] 1.3 `IfElseNode.evaluator.ts` — sets `activeOutputHandle`

- [ ] Task 2 — Implement React Flow components in `src/features/nodeEditor/nodes/logic/`
  - [ ] 2.1 `CompareNode.tsx` — operator selector, A/B input ports, result output port
  - [ ] 2.2 `AndNode.tsx`, `OrNode.tsx`, `NotNode.tsx` — boolean port layout
  - [ ] 2.3 `IfElseNode.tsx` — condition + value inputs, true/false branch outputs with active state styling

- [ ] Task 3 — Extend port type system for `boolean`
  - [ ] 3.1 Add `'boolean'` to `PortType` union in `src/features/nodeEditor/types/port.ts`
  - [ ] 3.2 Add amber color mapping in `getPortColor()` utility
  - [ ] 3.3 Update `getPortTypeFromHandle.ts` for logic node handles
  - [ ] 3.4 Update `validateConnection()` in 4.8 edge validation for boolean compatibility rules

- [ ] Task 4 — Register all logic nodes in NodeTypeRegistry
  - [ ] 4.1 `NodeTypeRegistry.register()` calls for all 5 node types under category `'Logic'`

- [ ] Task 5 — Unit tests
  - [ ] 5.1 Evaluator tests for all 5 node types (truth tables, null handling, edge cases)
  - [ ] 5.2 Conditional edge activation integration test (IfElse + downstream nodes)
  - [ ] 5.3 Edge validation tests for boolean port compatibility
