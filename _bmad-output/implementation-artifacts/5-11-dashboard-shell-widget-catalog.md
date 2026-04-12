# Story 5.11: Dashboard Shell, Widget Catalog & Add-Widget Flow

Status: backlog

<!--
Story Context: The dashboard page container/route and the user-facing mechanism for adding new widgets.
Without a dashboard shell, stories 5.1–5.10 have no page to render in.
Without an add-widget flow, users can never place their first widget.
Based on: Epic 5 Dashboard, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: No story defines the dashboard route, its navigation entry, or how widgets are added.
Analogous to 4.24 (Node Palette) for Node Forge — the discovery + placement entry point.
Also adds the ▶ Run button for manual Node Forge execution (flagged by Sally in party review).
-->

## Story

As a dashboard user,
I want a dashboard page for each project with a discoverable catalog for adding widget types,
so that I can set up my personalized view with the right charts and metrics without needing to know widget type names in advance.

**Story Points:** 3 (S-M) ~2-3 days
**Complexity:** Low-Medium (route/shell is straightforward; widget catalog parallels node palette 4.24)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] Dashboard route `/app/:profileId/project/:projectId/dashboard` renders the dashboard page
- [ ] App shell "Dashboard" sidebar entry navigates to the dashboard route
- [ ] Empty state shown when no widgets exist, with an "Add your first widget" CTA
- [ ] `+` button and `W` keyboard shortcut (canvas-focused) open the widget catalog
- [ ] Widget catalog displays all registered widget types grouped by category with icon + description
- [ ] Selecting a widget from the catalog adds an unconfigured widget to the grid (triggers 5.8 flow)
- [ ] Dashboard has an "Edit mode" / "View mode" toggle — drag/resize only available in edit mode
- [ ] `▶ Run` button in dashboard toolbar manually triggers all Node Forge workflow executions for the active project
- [ ] No regressions in existing app shell navigation (stories 1.4, 2.2 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: route rendering 85%, widget catalog filtering 90%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 1-4 (Three-Panel Shell Layout)** — MUST be complete. Sidebar navigation entry added here.
- **Story 5-2 (Widget Drag & Drop Resizing Shell)** — MUST be complete. Grid container rendered inside the shell.
- **Story 5-1 (CSS Grid Layout Serialization)** — MUST be complete. Dashboard loaded from PouchDB on route mount.
- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete for the ▶ Run button.

## Acceptance Criteria

### AC1: Dashboard Route & Navigation

**Given** the user is viewing a project  
**When** they click "Dashboard" in the app sidebar  
**Then**:

- Navigation goes to `/app/:profileId/project/:projectId/dashboard`
- The dashboard page loads the project's saved layout from PouchDB (story 5.1)
- Active sidebar item highlights "Dashboard"
- Browser/Tauri title bar shows: `{Project Name} — Dashboard �� Ledgy`

### AC2: Empty State

**Given** a project has no dashboard widgets yet  
**When** the dashboard page renders  
**Then**:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│          📊  Your dashboard is empty             │
│                                                  │
│   Add widgets to visualize your tracked data.    │
│   Connect them to your ledgers or Node Forge     │
│   workflows for live insights.                   │
│                                                  │
│             [+ Add your first widget]            │
│                                                  │
└──────────────────────────────────────────────────┘
```

Clicking the CTA opens the widget catalog (AC4).

### AC3: Edit Mode / View Mode Toggle

**Given** the dashboard has widgets  
**When** the user views the dashboard  
**Then** a toolbar at the top shows:

- **View mode** (default): widgets display their data; no drag handles or resize grips visible
- **Edit mode**: drag handles and resize grips appear (from 5.2); a floating "Done Editing" button exits to view mode
- Edit mode toggle button in toolbar: pencil icon, `aria-label="Edit dashboard layout"`
- `E` keyboard shortcut (dashboard-focused) toggles edit mode

Drag/resize interactions from 5.2 are only active in edit mode — this is the "Dashboard Read-Only Safeguard" complement (story 5.6 prevents ledger mutations; this prevents accidental layout changes).

### AC4: Widget Catalog

**Given** the user clicks `+` (toolbar) or presses `W` (keyboard)  
**When** the widget catalog opens  
**Then** it shows a panel with:

```
┌─────────────────────────────────┐
│ 🔍 Search widgets...       [✕]  │
├─────────────────────────────────┤
│ CHARTS                          │
│  📊 Bar Chart                   │
│     Compare values across       │
│     categories or over time     │
│                                 │
│  📈 Line Trend                  │
│     Track changes over time     │
│                                 │
│  ⚬⚬ Scatter Plot               │
│     Visualize correlations      │
│     between two fields          │
│                                 │
│ METRICS                         │
│  🔢 Metric Counter              │
│     Display a single value      │
│                                 │
│  Δ  Delta Metric                │
│     Value + change vs. period   │
└─────────────────────────────────┘
```

- Widget types sourced from a `WidgetTypeRegistry` (analogous to `NodeTypeRegistry` from 4.18)
- Search filters by name and description
- Clicking a widget type: adds an unconfigured `WidgetConfig` to the dashboard grid, auto-opens the 5.8 inspector panel for configuration
- Catalog dismissed via Escape, click-outside, or ✕ button

### AC5: WidgetTypeRegistry

**Given** a new widget type is being implemented (e.g., 5.10 Scatter Plot)  
**When** it is registered  
**Then**:

```typescript
WidgetTypeRegistry.register({
  type: 'scatter-plot',
  displayName: 'Scatter Plot',
  category: 'Charts',
  description: 'Visualize correlations between two fields',
  icon: '⚬⚬',
  defaultSize: { w: 4, h: 3 },          // CSS grid columns × rows
  component: ScatterPlotWidget,
  defaultDisplayOptions: { showTrendLine: true, pointSize: 'md' },
});
```

- Registry is the source of truth for all widget types
- Widget catalog derives its list from `WidgetTypeRegistry.getAll()`
- `defaultSize` is used when placing a new widget on the grid

### AC6: ▶ Run Button (Manual Node Forge Execution)

**Given** the dashboard has widgets sourced from Node Forge outputs  
**When** the user clicks the `▶ Run` button in the dashboard toolbar  
**Then**:

- All Node Forge workflows in the active project are re-evaluated by the execution runtime (4.18)
- Button shows a spinner during execution (`executionStatus === 'running'`)
- Button returns to normal with a ✓ badge when execution completes
- If any workflow errors: button shows a warning badge; clicking it opens the workflow list with errored workflows highlighted
- Keyboard shortcut: `Cmd/Ctrl + R` (dashboard-focused only)

**Note:** This is a *manual* re-run. Reactive evaluation (triggered automatically by data changes via 4.25 execution modes) operates independently and does not require user action.

## Tasks / Subtasks

- [ ] Task 1 — Dashboard route in `src/app/routes.tsx`
  - [ ] 1.1 Add `/app/:profileId/project/:projectId/dashboard` route
  - [ ] 1.2 Lazy-load `DashboardPage` component

- [ ] Task 2 — `DashboardPage` component in `src/features/dashboard/DashboardPage.tsx`
  - [ ] 2.1 `useEffect` loads layout from PouchDB on mount (5.1 load logic)
  - [ ] 2.2 Empty state when `widgets.length === 0`
  - [ ] 2.3 Toolbar: edit mode toggle, `+` add widget button, `▶ Run` button
  - [ ] 2.4 Passes `isEditMode` prop down to 5.2 widget grid

- [ ] Task 3 — Implement `WidgetTypeRegistry` in `src/features/dashboard/registry/WidgetTypeRegistry.ts`
  - [ ] 3.1 `register()`, `get()`, `getAll()`, `getByCategory()` methods (mirrors NodeTypeRegistry shape)
  - [ ] 3.2 Register all widget types: `bar-chart`, `line-chart`, `scatter-plot`, `metric-counter`, `delta-metric`

- [ ] Task 4 — `WidgetCatalog` component in `src/features/dashboard/components/WidgetCatalog.tsx`
  - [ ] 4.1 Reads from `WidgetTypeRegistry.getAll()` grouped by category
  - [ ] 4.2 Search filtering (case-insensitive, name + description)
  - [ ] 4.3 On selection: `useDashboardStore.addWidget(type, defaultSize)` + auto-open inspector
  - [ ] 4.4 Keyboard navigation (arrow keys, Enter, Escape) — mirrors NodePalette 4.24 pattern
  - [ ] 4.5 Full ARIA accessibility (`role="dialog"`, `role="listbox"` etc.)

- [ ] Task 5 — Edit mode toggle
  - [ ] 5.1 `isEditMode` state in `useDashboardStore`
  - [ ] 5.2 Wire `isEditMode` to 5.2 drag/resize enable/disable
  - [ ] 5.3 `E` keyboard shortcut handler (dashboard-focused)

- [ ] Task 6 — ▶ Run button
  - [ ] 6.1 Button calls `useNodeStore.runAllWorkflows(projectId)` (new store action)
  - [ ] 6.2 Loading/success/error states (spinner → ✓ badge → warning badge)
  - [ ] 6.3 `Cmd/Ctrl+R` shortcut (dashboard context only)

- [ ] Task 7 — App sidebar navigation entry
  - [ ] 7.1 Add "Dashboard" item to project-level sidebar section (in `AppShell.tsx` or `ProjectSidebar.tsx`)
  - [ ] 7.2 Active state when path starts with `/dashboard`

- [ ] Task 8 — Unit tests
  - [ ] 8.1 Dashboard route renders correctly with empty state
  - [ ] 8.2 Widget catalog: search filtering, keyboard nav, widget placement
  - [ ] 8.3 Edit mode toggle: drag handles visible in edit mode, hidden in view mode
