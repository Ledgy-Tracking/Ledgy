# Story 4.24: Node Palette & Add-Node UI

Status: backlog

<!--
Story Context: User-facing discovery mechanism for adding nodes to the canvas.
Based on: Epic 4 Node Forge, Gap identified in Party Mode Sprint Review 2026-04-13
Gap Source: No story defines how users discover and add node types to the canvas.
Stories 4.5, 4.6, etc. define node *components* but not the UI for inserting them.
Sally (UX) flagged: "If you ship 22 stories with 15 node types and no node palette, users can't build anything."
NodeTypeRegistry (4.18) is the data source for the palette.
-->

## Story

As a Node Forge user,
I want to browse and search available node types from a discoverable palette,
so that I can quickly find and place any node onto my canvas without needing to remember keyboard shortcuts or hidden menus.

**Story Points:** 3 (S-M) ~2-3 days
**Complexity:** Low-Medium (UI-focused; NodeTypeRegistry from 4.18 is the data source)

## Definition of Done

- [ ] All acceptance criteria implemented and verified
- [ ] Node palette accessible via: sidebar toggle button AND right-click canvas context menu AND `A` keyboard shortcut (canvas-focused)
- [ ] Palette displays all registered node types grouped by category (from `NodeTypeRegistry`)
- [ ] Real-time search filters nodes by name, category, and description
- [ ] Clicking a node in the palette places it at the canvas center (or at cursor for right-click)
- [ ] Palette is dismissible (Escape key, click outside, or toggle button)
- [ ] Palette persists its last search query during the session
- [ ] Accessible: full keyboard navigation (Tab, Enter to place, Escape to close, arrow keys to navigate list)
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.23 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: palette filtering 90%, keyboard navigation 80%
- [ ] Accessibility tests: WCAG 2.1 AA for palette interactions
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-18 (Node Graph Execution Runtime)** — MUST be complete. `NodeTypeRegistry` is the palette's data source.
- **Story 4-2 (React Flow Canvas Core)** — MUST be complete. Canvas-level keyboard shortcuts and context menu require canvas focus management.

## Acceptance Criteria

### AC1: Palette Entry Points

**Given** the user is on the Node Forge canvas  
**When** they want to add a node  
**Then** the palette can be opened via three entry points:

1. **Sidebar toggle button** — a `+` button in the canvas toolbar (left rail). Active state highlights when palette is open.
2. **Right-click context menu** — right-clicking on the empty canvas shows a context menu with "Add Node..." as the first item; selecting it opens the palette positioned near the cursor.
3. **Keyboard shortcut** — pressing `A` while the canvas is focused opens the palette (does not conflict with existing shortcuts from 4.16).

All three entry points open the same `NodePalette` component.

### AC2: Palette UI Structure

**Given** the palette is open  
**When** it renders  
**Then**:

```
┌─────────────────────────────────┐
│ 🔍 Search nodes...         [✕] │  ← search input, auto-focused
├─────────────────────────────────┤
│ DATA SOURCES                    │  ← category header
│  💾 Ledger Source               │  ← node entry (icon + name)
│                                 │
│ MATH & STATISTICS               │
│  📊 Correlation                 │
│  ➕ Arithmetic                  │
│                                 │
│ LOGIC                           │
│  ⚖ Compare                     │
│  🔀 If/Else                     │
│  ∧  AND                         │
│  ∨  OR                          │
│  ¬  NOT                         │
│                                 │
│ TEMPORAL                        │
│  📅 Date Diff                   │
│  📅 Date Add                    │
│                                 │
│ STRING                          │
│  [str] Concat                   │
│  ... (etc.)                     │
│                                 │
│ OUTPUT                          │
│  📤 Result Output               │
│                                 │
│ AUTOMATION                      │
│  ⚡ Trigger (On Create)         │
│  🎯 Action (Write Entry)        │
└─────────────────────────────────┘
```

- Categories derived from `NodeTypeRegistry.getByCategory()` in alphabetical order
- Each entry shows: icon, display name, one-line description (on hover/focus)
- Empty search results state: "No nodes match '{query}'"

### AC3: Search Filtering

**Given** the user types in the search field  
**When** the query matches partial text  
**Then**:

- Filtering runs on: `displayName`, `category`, and `description` fields from `NodeTypeRegistry`
- Matching is case-insensitive
- Category headers are hidden when all nodes in a category are filtered out
- Search results update in <50ms for a registry of up to 50 node types
- Clearing the search restores the full grouped view

### AC4: Node Placement

**Given** the user clicks a node in the palette  
**When** the node is selected  
**Then**:

- **From sidebar palette:** node is placed at the viewport center in canvas-space coordinates (corrected for pan/zoom — fixes deferred W1 from 4.2 code review)
- **From right-click context menu:** node is placed at the canvas position corresponding to the cursor at the time of right-click
- Newly placed node is immediately selected (React Flow selection state)
- Palette closes after placement
- `useNodeStore.addNode()` is called with a `crypto.randomUUID()` ID (fixes deferred W5 from 4.2 code review)

### AC5: Keyboard Navigation

**Given** the palette is open  
**When** the user navigates with the keyboard  
**Then**:

- Palette opens with focus in the search input
- `Tab` / `Shift+Tab` moves focus through nodes
- `Arrow Down` / `Arrow Up` moves between node entries (wraps at list boundaries)
- `Enter` places the focused node and closes the palette
- `Escape` closes the palette without placing a node, returns focus to the canvas
- All interactions meet WCAG 2.1 AA focus visibility requirements

### AC6: ARIA Accessibility

**Given** the palette renders  
**When** a screen reader user interacts  
**Then**:

- Palette panel has `role="dialog"` and `aria-label="Add Node"`
- Search input has `aria-label="Search node types"`
- Node list has `role="listbox"`
- Each node entry has `role="option"`, `aria-label="{displayName}: {description}"`
- Category headers have `role="group"` with `aria-labelledby`

## Tasks / Subtasks

- [ ] Task 1 — Implement `NodePalette` component in `src/features/nodeEditor/components/NodePalette.tsx`
  - [ ] 1.1 Read node list from `NodeTypeRegistry.getAll()` grouped by category
  - [ ] 1.2 Search input with real-time filtering (client-side, no debounce needed at <50 nodes)
  - [ ] 1.3 Category group headers (hidden when all items filtered)
  - [ ] 1.4 Node entry rows: icon + name + description on hover
  - [ ] 1.5 Keyboard navigation (arrow keys, Enter, Escape)
  - [ ] 1.6 Full ARIA markup (AC6)

- [ ] Task 2 — Wire entry points in `NodeCanvas.tsx`
  - [ ] 2.1 Sidebar `+` button toggle (add to toolbar)
  - [ ] 2.2 `A` keyboard shortcut handler (canvas-focused only — not when editing node config fields)
  - [ ] 2.3 Right-click context menu on canvas background (capture cursor position in canvas-space)

- [ ] Task 3 — Implement canvas-space placement (AC4)
  - [ ] 3.1 `getCanvasCenter()` utility using React Flow's `useReactFlow().getViewport()`
  - [ ] 3.2 `screenToCanvas(screenPos, viewport)` utility for right-click cursor position
  - [ ] 3.3 `useNodeStore.addNode(type, position)` action using `crypto.randomUUID()` (resolves W5 from 4.2 review)
  - [ ] 3.4 Verify pan/zoom correction for center placement (resolves W1 from 4.2 review)

- [ ] Task 4 — Unit tests in `src/features/nodeEditor/__tests__/NodePalette.test.tsx`
  - [ ] 4.1 Renders all NodeTypeRegistry categories
  - [ ] 4.2 Search filtering: partial match, case-insensitive, empty state
  - [ ] 4.3 Category hidden when all items filtered
  - [ ] 4.4 Keyboard navigation: arrow keys, Enter places node, Escape closes
  - [ ] 4.5 ARIA roles and labels present
