# Story 5.10: Scatter Plot Widget Kernel

Status: backlog

<!--
Story Context: Scatter plot explicitly named in FR18. Missing from Epic 5's original 7 stories.
Based on: Epic 5 Dashboard, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: FR18 — "Bar Charts, Line Trends, Scatter Plots, Metric Counters" — scatter plot absent.
Primary use case: visualizing correlation outputs from Node Forge (4.6 Correlation Node → 4.21 Result Output → this widget).
Secondary use case: direct ledger two-field scatter (e.g., caffeine amount vs. sleep hours per day).
-->

## Story

As a dashboard user,
I want to add a scatter plot widget to my dashboard,
so that I can visually inspect the relationship between two tracked variables — such as caffeine intake and sleep quality — at a glance.

**Story Points:** 3 (S-M) ~2-3 days
**Complexity:** Low-Medium (Recharts/D3 scatter component; key complexity is dual-axis WidgetDataSource binding in 5.8 config)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] `ScatterPlotWidget` renders X/Y scatter points from `WidgetDataPayload`
- [ ] Dual-axis data source: X-axis and Y-axis can each be configured independently via 5.8 inspector
- [ ] Optional trend line (linear regression) rendered as an overlay when enabled
- [ ] Correlation coefficient (`r`) badge displayed in corner when both axes configured and ≥2 data points
- [ ] Hover tooltip shows `{ x value, y value, entry date }` on point hover
- [ ] Responsive sizing within CSS grid cell (uses container query or ResizeObserver)
- [ ] Matches Ledgy dark theme (zinc-900 background, emerald-400 data points, amber trend line)
- [ ] No regressions in existing dashboard functionality (stories 5.1–5.9 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: data transformation 90%, correlation calculation 85%
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 5-3 (Bar & Line Trend Component Kernels)** — MUST be complete. Establishes Recharts/D3 integration pattern, theme tokens, and responsive sizing approach.
- **Story 5-8 (Widget Configuration & Data Source Binding)** — MUST be complete. Dual-axis data source config added to `WidgetConfig.displayOptions` here.
- **Story 5-9 (Direct Ledger Widget Data Binding)** — MUST be complete. `WidgetDataPayload` type and both data hooks required.

## Acceptance Criteria

### AC1: Dual-Axis Data Source Configuration

**Given** a scatter plot widget is being configured in the 5.8 inspector panel  
**When** the "Data Source" section renders for a `scatter-plot` widget type  
**Then** it shows **two independent data source selectors**:

- **X-Axis**: full `WidgetDataSource` selector (Path A ledger OR Path B Node Forge output)
- **Y-Axis**: separate full `WidgetDataSource` selector

Both selectors are required for the widget to render. Either can use either path independently — e.g., X-axis from a direct ledger field, Y-axis from a Node Forge computation.

This extends `WidgetConfig.displayOptions` for scatter plots:
```typescript
interface ScatterPlotDisplayOptions {
  xAxisSource: WidgetDataSource | null;
  yAxisSource: WidgetDataSource | null;
  xAxisLabel: string;
  yAxisLabel: string;
  showTrendLine: boolean;
  pointSize: 'sm' | 'md' | 'lg'; // default: 'md'
}
```

### AC2: Data Point Alignment by Date

**Given** X-axis and Y-axis data sources are both configured  
**When** the widget fetches data from both sources  
**Then** data points are aligned by matching entry date (UTC date, day precision):

- Entries are paired by their `createdAt` date (truncated to day)
- A data point `{ x, y }` is created only when both axes have an entry on the same day
- Days where only one axis has data are excluded (no partial points)
- The aligned pairs are sorted by date ascending for the trend line calculation

This alignment logic lives in `src/features/dashboard/utils/alignScatterData.ts`.

### AC3: Scatter Plot Rendering

**Given** aligned `{ x, y }` pairs are available  
**When** the widget renders  
**Then**:

- Points plotted as circles, `emerald-400`, opacity 0.8
- X-axis and Y-axis labeled from `displayOptions.xAxisLabel` / `yAxisLabel`
- Axes use numeric ticks auto-scaled to the data range with 10% padding
- Minimum 2 data points required to render; fewer shows: *"Need at least 2 matching data points"*
- Responsive: fills widget cell width/height using the same ResizeObserver pattern as 5.3

### AC4: Optional Trend Line

**Given** `displayOptions.showTrendLine === true` and ≥3 data points are available  
**When** the widget renders  
**Then**:

- A linear regression line is computed from the aligned `{ x, y }` pairs
- Rendered as a dashed `amber-400` line spanning the full X-axis range
- Slope and intercept computed client-side using least-squares formula
- Trend line not rendered if < 3 data points (silently hidden, no error)

### AC5: Correlation Coefficient Badge

**Given** both axes are configured and ≥2 data points are available  
**When** the widget renders  
**Then** a small badge in the top-right corner of the widget shows:

```
r = -0.78
```

- Computed as Pearson's r from the aligned pairs (reuses the same formula as 4.6 Correlation Node)
- Color coded: `emerald` (strong positive r > 0.6), `amber` (weak |r| < 0.3), `red` (strong negative r < -0.6)
- Badge hidden when < 2 points
- Hovering the badge shows a tooltip: *"Pearson correlation coefficient. -1 = perfect inverse, 0 = no correlation, 1 = perfect correlation."*

### AC6: Hover Tooltip

**Given** the user hovers over a scatter point  
**When** the tooltip renders  
**Then** it shows:
```
Date:  2026-03-15
X:     180 mg  (or the X-axis field name + value)
Y:     6.5 hrs (or the Y-axis field name + value)
```

## Tasks / Subtasks

- [ ] Task 1 — Data alignment utility in `src/features/dashboard/utils/alignScatterData.ts`
  - [ ] 1.1 Align two `WidgetDataPayload[]` by UTC day, return `{ x, y, date }[]`
  - [ ] 1.2 Unit tests: perfect alignment, partial days excluded, empty result handling

- [ ] Task 2 — `ScatterPlotWidget` component in `src/features/dashboard/widgets/ScatterPlotWidget.tsx`
  - [ ] 2.1 Dual `useLedgerWidgetData` / `useWorkflowOutputAsWidgetData` calls (one per axis)
  - [ ] 2.2 Call `alignScatterData()` to produce `{ x, y }` pairs
  - [ ] 2.3 Recharts `<ScatterChart>` with emerald points, labeled axes, responsive container
  - [ ] 2.4 Hover tooltip (AC6)
  - [ ] 2.5 "< 2 points" empty state message

- [ ] Task 3 — Trend line overlay
  - [ ] 3.1 `linearRegression(points)` utility: returns `{ slope, intercept }`
  - [ ] 3.2 Render as Recharts `<Line>` with dashed amber-400 style
  - [ ] 3.3 Unit test: slope/intercept correct for known dataset

- [ ] Task 4 — Correlation badge component
  - [ ] 4.1 `CorrelationBadge.tsx` — Pearson's r from aligned points, color-coded
  - [ ] 4.2 Reuse formula from 4.6 correlation evaluator (extract to shared `src/lib/statistics.ts`)
  - [ ] 4.3 Unit test: r = -1, 0, 1 edge cases

- [ ] Task 5 — Extend 5.8 widget config for dual-axis scatter plot (AC1)
  - [ ] 5.1 Add `ScatterPlotDisplayOptions` to `WidgetConfig.displayOptions` discriminated type
  - [ ] 5.2 Extend `WidgetInspectorPanel` to show dual data source selectors for scatter-plot type

- [ ] Task 6 — Register scatter plot in widget catalog (5.11)
  - [ ] 6.1 Add `{ type: 'scatter-plot', displayName: 'Scatter Plot', icon: '⚬⚬', description: 'Visualize correlations between two fields' }` to widget type registry
