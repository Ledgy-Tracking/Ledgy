# Story 4.20: Temporal & String Operator Nodes (Date Diff, Date Add, String Manipulation)

Status: backlog

<!--
Story Context: Covers the temporal and string halves of FR29 — not covered by 4.6 (arithmetic/correlation) or 4.19 (logic gates).
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: FR29 explicitly lists "temporal calculations (Date Diff)" and "string manipulation" — absent from all prior stories.
-->

## Story

As a Node Forge user,
I want to insert temporal and string operator nodes into my workflow,
so that I can perform date arithmetic (e.g., days since last entry) and string transformations (e.g., format a label from multiple fields) as part of my automation logic.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium (standard evaluator pattern from 4.18; locale-safe date handling requires care)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `DateDiff` node calculates the signed difference between two dates in a configurable unit
- [ ] `DateAdd` node adds/subtracts a duration to/from a date
- [ ] `StringConcat` node joins multiple string inputs with a configurable separator
- [ ] `StringSlice` node extracts a substring by start/end index or length
- [ ] `StringContains` node checks if a string contains a substring, outputting boolean
- [ ] `StringFormat` node applies a template pattern with `{field}` interpolation
- [ ] All nodes implement `NodeEvaluator` from 4.18; registered in `NodeTypeRegistry`
- [ ] `date` and `string` port types extended where needed in 4.8 validation
- [ ] Visual design: violet accent color scheme for temporal nodes, sky accent for string nodes
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.19 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: each evaluator 90% (including locale edge cases for date nodes)
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete. `NodeEvaluator` interface and `NodeTypeRegistry` required.
- **Story 4-8 (Strict Edge Type Validation)** — MUST be complete. `date` and `string` port types must be validated.

## Acceptance Criteria

### AC1: DateDiff Node

**Given** a user has placed a DateDiff node and connected two date outputs  
**When** the graph evaluates  
**Then**:

- **Input ports:** `dateA` (Date), `dateB` (Date)
- **Output port:** `diff` (number) — signed result (`dateA - dateB`); positive if A is later
- **Configuration:** unit selector — `days` (default) | `hours` | `weeks` | `months`
- **Display:** "15 days" shown as live preview in node body
- **Edge cases:** either input `null` → `null` output with "Date required" tooltip
- **Locale safety:** uses UTC-normalized calculation; not affected by DST transitions
- **Visual:** violet-500 header, `CalendarDays` icon
- **Data contract:**
```typescript
inputs:  { dateA: Date | null; dateB: Date | null; }
config:  { unit: 'days' | 'hours' | 'weeks' | 'months' }
outputs: { diff: number | null }
```

### AC2: DateAdd Node

**Given** a user has placed a DateAdd node  
**When** connected to a date and a number  
**Then**:

- **Input ports:** `baseDate` (Date), `amount` (number)
- **Output port:** `result` (Date)
- **Configuration:** unit selector — `days` | `hours` | `weeks` | `months`; direction toggle `+` / `-`
- **Use case example:** "30 days from now" — wire a Ledger Source date field + constant 30 → DateAdd
- **Edge case:** `amount = 0` returns `baseDate` unchanged
- **Visual:** violet-500 header, `CalendarPlus` icon

### AC3: StringConcat Node

**Given** a user has placed a StringConcat node  
**When** connected to one or more string inputs  
**Then**:

- **Input ports:** dynamic — starts with 2 inputs (`a`, `b`); user can add up to 8 inputs via a `+` button
- **Output port:** `result` (string)
- **Configuration:** separator field (default: `""` empty string); common presets: space, comma, dash, newline
- **Edge case:** `null` inputs treated as empty string `""` with a warning badge
- **Visual:** sky-500 header, `Link` icon

### AC4: StringSlice Node

**Given** a user has placed a StringSlice node  
**When** connected to a string input  
**Then**:

- **Input ports:** `source` (string)
- **Output port:** `result` (string)
- **Configuration:** `start` (number, 0-indexed), `end` (number, exclusive) OR `length` (number)
- **Preview:** shows live sliced result in node body (truncated to 30 chars)
- **Edge case:** `start ≥ source.length` → empty string `""` with warning

### AC5: StringContains Node

**Given** a user has placed a StringContains node  
**When** connected to a string input  
**Then**:

- **Input ports:** `source` (string), `search` (string)
- **Output port:** `result` (boolean) — chains directly to logic gates (4.19)
- **Configuration:** case-sensitivity toggle (default: case-insensitive)
- **Use case example:** flag entries whose Notes field contains "migraine" → wire to IfElse node

### AC6: StringFormat Node

**Given** a user places a StringFormat node  
**When** connected to multiple named inputs and the graph evaluates  
**Then**:

- **Input ports:** dynamic — each port is named by the user (e.g., `name`, `amount`)
- **Output port:** `result` (string)
- **Configuration:** template text field with `{portName}` interpolation syntax
- **Example:** template `"Spent {amount} on {category}"` with inputs `amount=42`, `category="food"` → `"Spent 42 on food"`
- **Edge case:** unknown `{placeholder}` in template → rendered as empty string with tooltip warning

### AC7: Port Type Extension

**Given** the `date` and `string` port types are already in the system (4.5, 4.7)  
**When** temporal and string nodes are wired  
**Then**:

- `DateDiff` output (`number`) connects to `Arithmetic`/`Compare`/`IfElse` inputs ✓
- `DateAdd` output (`date`) connects to other `DateDiff`/`DateAdd`/`Ledger Source date field` inputs ✓
- `StringContains` output (`boolean`) connects to `AND`/`OR`/`NOT`/`IfElse` inputs ✓
- `StringFormat` output (`string`) connects to Action Node string fields ✓

All cross-type connections validated by existing 4.8 edge validation rules.

## Tasks / Subtasks

- [ ] Task 1 — Implement temporal evaluators in `src/features/nodeEditor/nodes/temporal/`
  - [ ] 1.1 `DateDiffNode.evaluator.ts` — UTC-normalized diff logic
  - [ ] 1.2 `DateAddNode.evaluator.ts` — direction-aware date arithmetic
  - [ ] 1.3 Unit tests for both: DST edge cases, null inputs, unit conversions

- [ ] Task 2 — Implement string evaluators in `src/features/nodeEditor/nodes/string/`
  - [ ] 2.1 `StringConcatNode.evaluator.ts` — dynamic port support
  - [ ] 2.2 `StringSliceNode.evaluator.ts` — bounds checking
  - [ ] 2.3 `StringContainsNode.evaluator.ts` — case-insensitive search
  - [ ] 2.4 `StringFormatNode.evaluator.ts` — template interpolation with unknown key handling
  - [ ] 2.5 Unit tests for all: empty strings, null handling, boundary indices

- [ ] Task 3 — Implement React Flow components
  - [ ] 3.1 Temporal nodes: `DateDiffNode.tsx`, `DateAddNode.tsx` (violet accent)
  - [ ] 3.2 String nodes: `StringConcatNode.tsx` (dynamic ports), `StringSliceNode.tsx`, `StringContainsNode.tsx`, `StringFormatNode.tsx` (sky accent)
  - [ ] 3.3 Dynamic port add/remove UI for `StringConcatNode` and `StringFormatNode`

- [ ] Task 4 — Register all nodes in NodeTypeRegistry
  - [ ] 4.1 `DateDiff`, `DateAdd` under category `'Temporal'`
  - [ ] 4.2 `StringConcat`, `StringSlice`, `StringContains`, `StringFormat` under category `'String'`
