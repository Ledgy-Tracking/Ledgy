# Refactoring Story: Data Hierarchy & Dashboard Functionality

Status: done

## Story

As a developer,
I need to fix the data model scoping and implement a truly flexible dashboard,
So that users can build multiple isolated projects within their profiles and arrange their widgets visually as designed.

## Acceptance Criteria

1. **Project Scope Enforcement:** All Node Editor canvases and Dashboard layouts are explicitly scoped to a `projectId`, rather than saving as a single generic `'default'` entity directly under the `profileId`.
2. **Flexible Widget Grid (Draggable):** The Dashboard Grid supports dragging and dropping widgets to rearrange them, updating and persisting their `{ x, y, w, h }` position configuration via an interactive library like `react-grid-layout`.
3. **Data Translation Layer:** The Node Engine produces structured data (e.g., trend analysis, array histories) that the `DashboardOutputNode` passes to the `useDashboardStore`, enabling Chart and Trend widgets to render actual visualization data, not just single numeric results.
4. **Widget Configuration UI:** A "Widget Settings" panel allows users to modify a widget's title, type, and source node mapping directly from the Dashboard view without returning to the Node Editor.
5. **No Regressions:** All existing automated tests continue to pass after data model and layout updates.

## Tasks / Subtasks

- [x] Task 1: Refactor `useNodeStore` & `useDashboardStore`
  - [x] Add `projectId` parameters to `loadCanvas`, `saveCanvas`, `fetchWidgets`, and `saveWidgets`.
  - [x] Update `App.tsx` routing and `Dashboard.tsx` parameters to correctly pass `projectId`.
- [x] Task 2: Implement Draggable Dashboard Grid
  - [x] Integrate `react-grid-layout` (or similar) into `DashboardView.tsx`.
  - [x] Wire layout change events to `useDashboardStore.updateWidget` position state.
- [x] Task 3: Build Node-to-Widget Translation Layer
  - [x] Expand `computeCorrelation` and `computeArithmetic` output models to include historical array data or trend vectors.
  - [x] Update `ChartWidget` and `TrendWidget` to consume and render this new structured data payload.
- [x] Task 4: Widget Configuration UI
  - [x] Create a `WidgetConfigSheet.tsx` (using Shadcn Sheet) triggered by a "settings" icon on each dashboard widget.
  - [x] Allow editing title and type natively from the dashboard.

## Dev Agent Record

### Agent Model Used
Antigravity (Gemini 2.0 Flash Thinking)

### Completion Notes List
- ✅ Added `projectId` parameter to `useNodeStore` and `useDashboardStore`
- ✅ Updated `App.tsx` routing to pass `projectId` to `node-forge` route
- ✅ Integrated `react-grid-layout` for draggable and resizable dashboard widgets
- ✅ Implemented data translation layer in `computation.worker.ts` and `computationService.ts` to output chartData, trend, and changePercent
- ✅ Created `WidgetConfigSheet.tsx` to configure widgets from the dashboard
- ✅ Refactored `Dashboard.tsx` and `DashboardView.tsx` to integrate Grid/Table view toggling

### File List
- `src/stores/useNodeStore.ts` - MODIFIED
- `src/stores/useDashboardStore.ts` - MODIFIED
- `src/App.tsx` - MODIFIED
- `src/features/nodeEditor/NodeCanvas.tsx` - MODIFIED
- `src/features/dashboard/Dashboard.tsx` - MODIFIED
- `src/features/dashboard/DashboardView.tsx` - MODIFIED
- `src/features/dashboard/WidgetConfigSheet.tsx` - NEW
- `src/types/dashboard.ts` - MODIFIED
- `src/workers/computation.worker.ts` - MODIFIED
- `src/services/computationService.ts` - MODIFIED
- `src/features/nodeEditor/nodes/ArithmeticNode.tsx` - MODIFIED
- `src/features/nodeEditor/nodes/CorrelationNode.tsx` - MODIFIED
- `tests/NodeCanvas.test.tsx` - MODIFIED
- `tests/Dashboard.test.tsx` - MODIFIED

### Change Log
- **2026-02-25**: Story R-2 implementation complete - Fixed project scoping, integrated `react-grid-layout`, added widget config UI, and completed data translation layer. 147 tests passing.
