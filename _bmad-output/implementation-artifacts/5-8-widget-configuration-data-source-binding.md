# Story 5.8: Widget Configuration & Data Source Binding

Status: backlog

<!--
Story Context: Critical missing story — the inspector panel for configuring what data a widget shows.
Without this, rendering kernels 5.3 and 5.4 render nothing because they have no way to receive
configuration about which data to display.
Based on: Epic 5 Dashboard, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: Stories 5.3/5.4 define rendering components but not the configuration UX that feeds them.
Architecture: WidgetDataSource discriminated union — 'ledger' (Path A) or 'workflow-output' (Path B).
-->

## Story

As a dashboard user,
I want to configure each widget's data source and display options through an inspector panel,
so that the widget knows which ledger field or Node Forge output to display and how to visualize it.

**Story Points:** 5 (M) ~3-4 days
**Complexity:** Medium (configuration schema design, two data source paths, persistent binding to PouchDB)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `WidgetDataSource` discriminated union type defined covering both Path A (direct ledger) and Path B (Node Forge output)
- [ ] Widget inspector panel opens when a widget is selected in edit mode
- [ ] Path A: user can select a ledger, a field, a date range preset, and an aggregation method
- [ ] Path B: user can select a workflow and one of its named Result Output ports
- [ ] Widget configuration persists to PouchDB as part of the dashboard layout document
- [ ] Unconfigured widget shows a placeholder UI: "Click to configure data source"
- [ ] Changing data source triggers a confirmation if the widget already has data
- [ ] No regressions in existing dashboard functionality (stories 5.1–5.7 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: config schema validation 90%, data source switching 85%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 5-2 (Widget Drag & Drop Resizing Shell)** — MUST be complete. Widget selection model required.
- **Story 5-1 (CSS Grid Layout Serialization)** — MUST be complete. Widget config is part of the layout document.
- **Story 4-21 (Result Output Node)** — MUST be complete for Path B. `useWorkflowOutput` hook required.
- **Story 5-9 (Direct Ledger Widget Data Binding)** — SHOULD be complete for Path A before full config testing.

## Acceptance Criteria

### AC1: WidgetDataSource Type

**Given** any widget needs to know where to get its data  
**When** the widget's config is stored or read  
**Then** the `WidgetDataSource` type is the single contract:

```typescript
type WidgetDataSource =
  | {
      type: 'ledger';
      ledgerId: string;
      fieldId: string;
      dateRange: 'last-7d' | 'last-30d' | 'last-90d' | 'all-time' | 'custom';
      customDateRange?: { from: string; to: string }; // ISO dates, for 'custom'
      aggregation: 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count';
    }
  | {
      type: 'workflow-output';
      workflowId: string;
      outputName: string;
    };

interface WidgetConfig {
  id: string;
  type: 'bar-chart' | 'line-chart' | 'scatter-plot' | 'metric-counter' | 'delta-metric';
  title: string;
  dataSource: WidgetDataSource | null;    // null = unconfigured
  displayOptions: Record<string, unknown>; // widget-type-specific options
}
```

### AC2: Unconfigured Widget Placeholder

**Given** a widget has been added to the dashboard but not configured  
**When** the dashboard renders  
**Then** the widget shows:

```
┌────────────────────────────┐
│  📊 Bar Chart              │
│                            │
│    ⚙ Configure data        │
│    source to display       │
│    this widget             │
│                            │
│    [Configure →]           │
└────────────────────────────┘
```

Clicking anywhere on the placeholder opens the configuration panel.

### AC3: Widget Inspector Panel

**Given** a widget is selected in dashboard edit mode  
**When** the inspector panel opens (slides in from the right, consistent with Node Forge inspector)  
**Then** it shows:

**Header section:**
- Widget title field (editable text input)
- Widget type label (read-only, e.g., "Bar Chart")

**Data Source section:**
- Toggle: `Direct Ledger Data` | `Node Forge Output`

**If "Direct Ledger Data" (Path A):**
- Ledger selector (dropdown, all ledgers in the active project)
- Field selector (dropdown, filtered to numeric or date fields based on widget type)
- Date range selector: Last 7 days | Last 30 days | Last 90 days | All time | Custom range
- Aggregation selector: None (raw values) | Sum | Average | Min | Max | Count

**If "Node Forge Output" (Path B):**
- Workflow selector (dropdown, all workflows in active project with at least one Result Output node)
- Output name selector (dropdown, all named outputs from the selected workflow)
- "Open workflow →" link (navigates to the workflow canvas)

**Display Options section** (widget-type specific, see AC4)

**Footer:** Save | Cancel

### AC4: Display Options by Widget Type

**Given** a specific widget type is being configured  
**When** the display options section renders  
**Then** it shows type-specific controls:

**Bar Chart / Line Chart:**
- X-axis label (text, default: field name)
- Y-axis label (text, default: "Value")
- Color picker (single color, zinc theme presets + custom)
- Show data points toggle (line chart only)

**Scatter Plot (5.10):**
- X-axis source selector (separate WidgetDataSource for the X dimension)
- Y-axis source selector (separate WidgetDataSource for the Y dimension)
- Point size: Small | Medium | Large
- Show trend line toggle

**Metric Counter / Delta Metric:**
- Display label (text, default: field name)
- Unit suffix (text, e.g., "hrs", "kg", "km")
- Decimal places (0–4)
- Comparison period for delta (Yesterday | Last week | Last month)

### AC5: Configuration Persistence

**Given** the user saves a widget configuration  
**When** the dashboard layout is written to PouchDB  
**Then** the `WidgetConfig` (including `dataSource` and `displayOptions`) is stored within the layout document's `widgets[]` array — extending story 5.1's grid layout serialization schema.

Loading the dashboard restores all widget configurations without re-prompting the user.

### AC6: Data Source Change Confirmation

**Given** a widget already has a configured and active data source  
**When** the user selects a different data source in the inspector panel  
**Then** a confirmation appears: *"Changing the data source will clear this widget's current display. Continue?"* — before overwriting the existing config.

## Tasks / Subtasks

- [ ] Task 1 — Define `WidgetDataSource` and `WidgetConfig` types in `src/types/dashboard.ts`
  - [ ] 1.1 Discriminated union as specified in AC1
  - [ ] 1.2 Extend dashboard layout document type from 5.1 to include `widgets: WidgetConfig[]`

- [ ] Task 2 — Build `WidgetInspectorPanel` in `src/features/dashboard/components/WidgetInspectorPanel.tsx`
  - [ ] 2.1 Data source type toggle (Path A / Path B)
  - [ ] 2.2 Path A controls: ledger selector, field selector, date range, aggregation
  - [ ] 2.3 Path B controls: workflow selector, output name selector, "Open workflow" link
  - [ ] 2.4 Display options section (dynamic by widget type — AC4)
  - [ ] 2.5 Save → persists to `useDashboardStore`; Cancel → reverts

- [ ] Task 3 — Unconfigured widget placeholder component
  - [ ] 3.1 `UnconfiguredWidgetPlaceholder.tsx` — placeholder UI with "Configure" CTA
  - [ ] 3.2 Click handler opens `WidgetInspectorPanel`

- [ ] Task 4 — Extend `useDashboardStore` with widget config state
  - [ ] 4.1 `updateWidgetConfig(widgetId, config)` action
  - [ ] 4.2 Persist widget configs as part of layout save (extends 5.1 persistence logic)

- [ ] Task 5 — Unit tests
  - [ ] 5.1 Path A config saved and restored correctly
  - [ ] 5.2 Path B config saved and restored correctly
  - [ ] 5.3 Data source change confirmation dialog shown when existing config present
  - [ ] 5.4 Unconfigured widget renders placeholder, not empty/broken widget
