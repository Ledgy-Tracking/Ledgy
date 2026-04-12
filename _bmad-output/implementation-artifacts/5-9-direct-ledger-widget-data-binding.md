# Story 5.9: Direct Ledger Widget Data Binding (Path A)

Status: backlog

<!--
Story Context: Widgets sourcing data directly from PouchDB ledger queries, bypassing Node Forge.
This is the "novice path" for Alex-type users who want a chart from their ledger without
first building a Node Forge workflow.
Based on: Epic 5 Dashboard, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: Story 5.5 only covers Node Forge → Widget (Path B). Direct ledger → Widget (Path A) has no story.
Design: useLedgerWidgetData hook parallel to 4.21's useWorkflowOutput hook.
-->

## Story

As a dashboard user who hasn't set up a Node Forge workflow,
I want to bind a widget directly to a ledger field,
so that I can see a chart of my tracked data immediately without needing to build a workflow first.

**Story Points:** 3 (S-M) ~2-3 days
**Complexity:** Low-Medium (PouchDB query + aggregation + reactive live updates; parallel pattern to useWorkflowOutput)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `useLedgerWidgetData` hook queries PouchDB for entries matching a configured `WidgetDataSource` of type `'ledger'`
- [ ] Supports date range presets: Last 7d / 30d / 90d / All time / Custom
- [ ] Supports aggregation modes: None (raw values array) / Sum / Average / Min / Max / Count
- [ ] Hook subscribes to PouchDB changes feed for the target ledger and re-fetches on new/updated/deleted entries
- [ ] Data is returned in a normalized `WidgetDataPayload` format consumed by all rendering kernels (5.3, 5.4)
- [ ] Loading, error, and empty states handled and surfaced to consuming widgets
- [ ] Works with all numeric and date field types; text fields return count aggregation only
- [ ] No regressions in existing dashboard functionality (stories 5.1–5.8 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: query logic 90%, aggregation functions 95%, live update reactivity 85%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 5-8 (Widget Configuration & Data Source Binding)** — MUST be complete. `WidgetDataSource` type defined there.
- **Story 3-1 (PouchDB Document Adapters)** — MUST be complete. Entry query patterns established.
- **Story 4-10 (Graph PouchDB Hydration Hooks)** — SHOULD be reviewed. Changes feed subscription pattern to reuse.

## Acceptance Criteria

### AC1: useLedgerWidgetData Hook Interface

**Given** a widget has `dataSource.type === 'ledger'` configured  
**When** the widget's rendering kernel calls the hook  
**Then**:

```typescript
// src/features/dashboard/hooks/useLedgerWidgetData.ts
function useLedgerWidgetData(
  source: Extract<WidgetDataSource, { type: 'ledger' }> | null
): {
  data: WidgetDataPayload | null;
  isLoading: boolean;
  error: string | null;
}

interface WidgetDataPayload {
  // For 'none' aggregation: array of { x: Date | string, y: number } points
  // For sum/avg/min/max/count: single { value: number, label: string }
  points: Array<{ x: Date | number | string; y: number; label?: string }>;
  summary: { min: number; max: number; avg: number; count: number } | null;
  fieldName: string;
  unit?: string; // from schema field metadata if available
  lastUpdatedAt: string; // ISO timestamp of most recent entry in result
}
```

`WidgetDataPayload` is the **same format consumed by 5.3 rendering kernels** — they don't know whether data came from a ledger query or a Node Forge output; they only see `WidgetDataPayload`.

### AC2: Date Range Filtering

**Given** the data source has a `dateRange` configured  
**When** `useLedgerWidgetData` runs its PouchDB query  
**Then**:

| `dateRange` value | Query behavior |
|---|---|
| `'last-7d'` | Entries where `createdAt >= now - 7 days` |
| `'last-30d'` | Entries where `createdAt >= now - 30 days` |
| `'last-90d'` | Entries where `createdAt >= now - 90 days` |
| `'all-time'` | No date filter applied |
| `'custom'` | Entries where `customDateRange.from <= createdAt <= customDateRange.to` |

Dates compared in UTC. Ghost entries (`isDeleted: true`) excluded.

### AC3: Aggregation Modes

**Given** the data source has an `aggregation` configured  
**When** raw entries are fetched from PouchDB  
**Then**:

| `aggregation` value | Output |
|---|---|
| `'none'` | One `{ x: entryDate, y: fieldValue }` point per entry, sorted by date ascending |
| `'sum'` | Single `{ value: sum(fieldValues) }` |
| `'avg'` | Single `{ value: mean(fieldValues) }` rounded to 2 decimal places |
| `'min'` | Single `{ value: min(fieldValues) }` |
| `'max'` | Single `{ value: max(fieldValues) }` |
| `'count'` | Single `{ value: count(entries) }` — works for all field types including text |

Null/undefined field values in entries are excluded from aggregation with a warning in `console.warn` (not user-visible error) for MVP.

### AC4: Live Updates via PouchDB Changes Feed

**Given** a widget is mounted with `type: 'ledger'` data source  
**When** a new entry is created, updated, or deleted in the bound ledger  
**Then**:

- The hook detects the change via a PouchDB `changes` feed subscription (reusing pattern from 4.10)
- Query re-runs within 500ms of the change event
- Widget re-renders with updated data without unmounting/remounting
- Changes feed subscription is cancelled on widget unmount (no memory leak)

### AC5: WidgetDataPayload as Shared Contract with Node Forge Path

**Given** a Bar Chart widget can be configured with either Path A (ledger) or Path B (Node Forge)  
**When** either data hook delivers data  
**Then** the Bar Chart rendering kernel receives the same `WidgetDataPayload` shape regardless of source:

- Path A: `useLedgerWidgetData()` → transforms PouchDB entries into `WidgetDataPayload`
- Path B: `useWorkflowOutput()` (4.21) + adapter → transforms `NodeValue` into `WidgetDataPayload`

The Path B adapter (`useWorkflowOutputAsWidgetData`) is a thin wrapper implemented in this story that normalizes 4.21's `NodeValue` output into `WidgetDataPayload`.

This single contract means rendering kernels (5.3, 5.4, 5.10) need zero changes to support either path.

### AC6: Type Constraints per Field Type

**Given** the user has selected a ledger and field in 5.8's configuration panel  
**When** the field type is `string` or `boolean`  
**Then**:

- Aggregation selector in 5.8 is locked to `count` only
- `useLedgerWidgetData` only supports `aggregation: 'count'` for non-numeric fields
- Attempting to pass `aggregation: 'avg'` on a string field returns an error payload: `{ error: "Aggregation 'avg' requires a numeric field" }`

## Tasks / Subtasks

- [ ] Task 1 — Implement `useLedgerWidgetData` hook in `src/features/dashboard/hooks/useLedgerWidgetData.ts`
  - [ ] 1.1 PouchDB query by `ledgerId` + date range filter (reuse entry query pattern from 3.1)
  - [ ] 1.2 Aggregation reducer functions (sum, avg, min, max, count, none)
  - [ ] 1.3 Transform results to `WidgetDataPayload`
  - [ ] 1.4 PouchDB changes feed subscription with 500ms debounce re-fetch
  - [ ] 1.5 `useEffect` cleanup for changes feed cancellation
  - [ ] 1.6 Loading / error / empty states

- [ ] Task 2 — Define `WidgetDataPayload` type in `src/types/dashboard.ts`
  - [ ] 2.1 Define `WidgetDataPayload` interface (shared contract for all widget kernels)
  - [ ] 2.2 Export from dashboard types index

- [ ] Task 3 — Implement `useWorkflowOutputAsWidgetData` adapter in `src/features/dashboard/hooks/useWorkflowOutputAsWidgetData.ts`
  - [ ] 3.1 Wraps `useWorkflowOutput(workflowId, outputName)` from 4.21
  - [ ] 3.2 Normalizes `NodeValue` (number, number[], etc.) into `WidgetDataPayload` format
  - [ ] 3.3 Handles scalar value from Node Forge as single-point payload

- [ ] Task 4 — Unit tests in `src/features/dashboard/__tests__/useLedgerWidgetData.test.ts`
  - [ ] 4.1 Date range: last-7d, all-time, custom range filters correct entries
  - [ ] 4.2 Aggregation: sum, avg, min, max, count produce correct values
  - [ ] 4.3 `none` aggregation returns sorted `{ x, y }` points
  - [ ] 4.4 Non-numeric field + non-count aggregation returns error payload
  - [ ] 4.5 Live update: new entry causes re-fetch and updated payload
  - [ ] 4.6 Changes feed cancelled on unmount (no listener leak)
  - [ ] 4.7 Ghost entries excluded from query results
