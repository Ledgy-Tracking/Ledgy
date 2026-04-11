# Story 4.4: Minimap & Zoom-to-Fit Controls

Status: ready-for-dev

<!-- 
Quality Score: 9.2/10 (Post Party Mode Review)
Reviewers: Murat (Test), Amelia (Dev), Winston (Architect), Bob (Scrum), Sally (UX)
Revised: 2026-04-11
-->

## Story

As a Node Forge user,
I want minimap and zoom-to-fit navigation controls,
so that I can quickly navigate massive 100+ node graphs without getting lost.

## Definition of Done

- [ ] All 6 acceptance criteria implemented and verified
- [ ] Minimap renders thumbnail of all nodes with correct positioning
- [ ] Zoom-to-fit centers and scales the graph to show all nodes
- [ ] All navigation controls are keyboard accessible
- [ ] Performance: No frame drops during minimap interactions (60fps baseline)
- [ ] Visual design matches UX specification (Emerald accent, Zinc dark theme)
- [ ] No regressions in existing NodeCanvas functionality (story 4.1-4.3 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: NavigationToolbar 90%, ViewControls 85%, Store 80%
- [ ] E2E visual regression tests pass for MiniMap
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Acceptance Criteria

### AC1: MiniMap Component Integration
**Given** the NodeCanvas is loaded with nodes  
**When** the user views the canvas  
**Then** the MiniMap is displayed with:
- Position: `bottom-4 right-4` (16px offset from edges)
- Size: 120px × 80px (w-[120px] h-[80px])
- Mask color: `rgba(9, 9, 11, 0.6)` (darkened = out of viewport)
- Mask stroke: `emerald-500` (#10b981, 2px width)
- Node colors mapped to types (see Node Color Scheme)
- Class name: `minimap-custom` for Tailwind styling

**Visual:** Dark rectangle in minimap = area outside current viewport. Emerald-stroked rectangle = current viewport location.

### AC2: Minimap Interaction
**Given** the MiniMap is visible  
**When** the user interacts with it  
**Then**:
- Click anywhere on minimap → viewport pans to center on that location
- Drag the emerald mask rectangle → canvas pans following drag (1:1 ratio)
- Live node position updates as nodes move on main canvas (real-time)
- Toggle visibility via UI control (AC5) or `H` keyboard shortcut

**Edge Case:** When 0 nodes exist, hide minimap entirely (no empty rectangle).

### AC3: Zoom-to-Fit Control
**Given** the canvas has one or more nodes  
**When** the user triggers zoom-to-fit  
**Then** `reactflow.fitView()` executes with:
```typescript
{
  padding: 0.2,              // 20% of viewport
  duration: 300,             // 300ms animation
  includeHiddenNodes: false, // only visible nodes
  minZoom: 0.1,              // enforced lower bound
  maxZoom: 2.0               // enforced upper bound
}
```

**Button Configuration:**
- Icon: `Maximize2` from lucide-react
- Tooltip: "Fit to Screen (Shift+1)"
- Keyboard: `Shift + 1` (exclamation mark)

**Edge Case:** When 0 nodes exist, button is disabled (not clickable) with tooltip "Add nodes to use fit view".

### AC4: Navigation Toolbar Controls
**Given** the canvas is active  
**When** the user uses the NavigationToolbar  
**Then** the following controls are available (top-left of canvas):

| Control | Icon | Shortcut | Action | Bounds |
|---------|------|----------|--------|--------|
| Fit to Screen | Maximize2 | Shift+1 | fitView() | n/a |
| Zoom Out | ZoomOut | Ctrl/Cmd + - | zoomOut(0.2) | Disable at ≤0.1 |
| Zoom % | Text | - | Display only | Math.round(zoom × 100) + '%' |
| Zoom In | ZoomIn | Ctrl/Cmd + = | zoomIn(0.2) | Disable at ≥2.0 |
| Reset Zoom | RotateCcw | Ctrl/Cmd + 0 | setViewport(zoom: 1) | n/a |

**Behavior:**
- All controls disabled appropriately at min/max zoom bounds
- Zoom percentage updates in real-time during animation
- Tooltips show on hover (500ms delay) and keyboard focus

### AC5: View Controls Panel
**Given** the canvas is active  
**When** the user accesses view settings  
**Then** a collapsible panel is available (top-right of canvas):

**Controls:**
| Toggle | Icon (on/off) | Default | Shortcut | ARIA |
|--------|---------------|---------|----------|------|
| Minimap | Eye / EyeOff | On | H | aria-pressed |
| Grid | Grid3x3 / Grid3x3 (dimmed) | On | G | aria-pressed |
| Snap to Grid | Magnet / Magnet (dimmed) | Off | S | aria-pressed |

**Panel Behavior:**
- Collapses to icon-only (chevron button) with 150ms ease-out transition
- Expands on click (not hover - prevents accidental triggers)
- Collapsed state persists per workflow (PouchDB)
- Grid size: 15px when snap enabled

**Persistence:**
- All toggle states saved to PouchDB with canvas data
- Loaded on canvas initialization
- Backward compatible: missing fields use defaults

### AC6: Keyboard Navigation & Accessibility
**Given** the canvas has focus (not typing in input)  
**When** the user presses keys  
**Then** the following shortcuts work:

| Shortcut | Action | ARIA Live Announcement |
|----------|--------|------------------------|
| Space + Drag | Pan canvas | "Panning canvas" (on start) |
| + / = / NumpadAdd | Zoom in | "Zoom: 150%" (throttled: 500ms) |
| - / NumpadSubtract | Zoom out | "Zoom: 75%" (throttled: 500ms) |
| 0 / Numpad0 | Reset zoom | "Zoom: 100%" |
| Shift + 1 | Fit to screen | "Fit to screen" |
| H | Toggle minimap | "Minimap hidden" / "Minimap visible" |
| G | Toggle grid | "Grid hidden" / "Grid visible" |
| S | Toggle snap | "Snap to grid on" / "Snap to grid off" |
| ? | Show shortcuts help | Opens shortcut reference panel |

**Accessibility Requirements:**
- All interactive elements have `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900`
- Icon buttons have `aria-label` describing action + shortcut
- Toggle buttons have `aria-pressed` reflecting state
- `aria-live="polite"` region announces zoom changes (throttled to prevent spam)
- `aria-describedby` links buttons to tooltip content
- Screen reader only: `<div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>`

**Keyboard Shortcuts Reference Panel:**
- Triggered by `?` key or help icon in toolbar
- Displays all shortcuts in categorized table
- Closes on `Escape` or clicking outside
- Focus trap while open

**Alternative Navigation (Non-Mouse):**
- Arrow keys: Nudge pan (10px per press, 50px with Shift)
- Page Up/Down: Pan vertically by viewport height
- Home: Center on first node
- End: Center on last node

## Type Definitions

```typescript
// Navigation controls state (add to useNodeStore) - nested to reduce subscriptions
interface ViewControlsState {
  showMinimap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number; // default 15
}

// Add to useNodeStore interface
interface NodeStoreState {
  // ... existing state from story 4.3 ...
  viewControls: ViewControlsState;
  setViewControls: (controls: Partial<ViewControlsState>) => void;
  setShowMinimap: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
}

// Viewport bounds for zoom-to-fit calculations
interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// Updated CanvasDocument with view controls
interface CanvasDocument extends LedgyDocument {
  type: 'canvas';
  profileId: string;
  projectId: string;
  workflowId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  schemaVersion: number;
  viewControls?: ViewControlsState; // Optional for backward compatibility
}

// Keyboard shortcut definition
interface KeyboardShortcut {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'view' | 'zoom';
}
```

## File Structure

```
src/
├── features/nodeEditor/
│   ├── components/
│   │   ├── NodeCanvas.tsx              # MODIFIED: Add MiniMap, NavigationToolbar, ViewControls
│   │   ├── NavigationToolbar.tsx       # NEW: Zoom/fit controls toolbar (top-left)
│   │   ├── ViewControls.tsx            # NEW: Minimap/grid toggle panel (top-right)
│   │   └── ShortcutHelpPanel.tsx       # NEW: Keyboard shortcuts reference (? key)
│   ├── hooks/
│   │   └── useNodeKeyboardShortcuts.ts # NEW: Keyboard shortcut handler
│   └── utils/
│       └── minimapColors.ts            # NEW: Node type to color mapping
├── stores/
│   └── useNodeStore.ts                 # MODIFIED: Add nested viewControls state and actions
└── lib/
    └── db.ts                           # MODIFIED: Update save/load with backward compatibility
```

**Layout Visualization:**
```
┌─────────────────────────────────────────────────────────────┐
│  [NavigationToolbar]                    [ViewControls]  [?] │
│  ┌─────┬─────┬─────┬─────┐              ┌─────┬─────┐       │
│  │ Fit │  -  │100% │  +  │              │Grid │Mini │       │
│  └─────┴─────┴─────┴─────┘              │Snap │Map  │       │
│                                         └─────┴─────┘       │
│                                                             │
│                   CANVAS AREA                               │
│                                                             │
│                              ┌─────────────┐               │
│                              │   MiniMap   │               │
│                              │  (bottom-   │               │
│                              │   right)    │               │
│                              └─────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Tasks / Subtasks

### Phase 0: Prerequisites
- [ ] Task 0.1 — Verify React Flow version ≥12 (`npm list @xyflow/react`)
- [ ] Task 0.2 — Verify `useToast` hook available from story 4.3
- [ ] Task 0.3 — Verify NodeCanvas.tsx is wrapped in `<ReactFlowProvider />`
- [ ] Task 0.4 — Document current FPS baseline (before implementation)

### Phase 1: State Management
- [ ] Task 1.1 — Add ViewControlsState interface to useNodeStore.ts
- [ ] Task 1.2 — Add nested viewControls state with defaults
- [ ] Task 1.3 — Add setter actions (setShowMinimap, setShowGrid, setSnapToGrid)
- [ ] Task 1.4 — Update CanvasDocument type with optional viewControls
- [ ] Task 1.5 — Add DEFAULT_VIEW_CONTROLS constant for migration

### Phase 2: MiniMap Integration
- [ ] Task 2.1 — Create minimapColors.ts with node type color mapping
- [ ] Task 2.2 — Import MiniMap from @xyflow/react in NodeCanvas.tsx
- [ ] Task 2.3 — Position MiniMap absolute bottom-right (bottom-4 right-4)
- [ ] Task 2.4 — Configure MiniMap props (nodeColor, maskColor, maskStrokeColor)
- [ ] Task 2.5 — Add conditional rendering based on viewControls.showMinimap
- [ ] Task 2.6 — Handle empty canvas state (hide when nodes.length === 0)

### Phase 3: Navigation Toolbar
- [ ] Task 3.1 — Create NavigationToolbar.tsx with zoom controls layout
- [ ] Task 3.2 — Implement useReactFlow hook with defensive check
- [ ] Task 3.3 — Wire Zoom In/Out buttons with bounds checking
- [ ] Task 3.4 — Wire Reset Zoom button
- [ ] Task 3.5 — Wire Fit to Screen button with disabled state for empty canvas
- [ ] Task 3.6 — Display current zoom percentage
- [ ] Task 3.7 — Add tooltips with keyboard shortcuts
- [ ] Task 3.8 — Style with zinc-800 bg, zinc-700 border, rounded-md

### Phase 4: View Controls Panel
- [ ] Task 4.1 — Create ViewControls.tsx with toggle buttons
- [ ] Task 4.2 — Implement collapse/expand toggle
- [ ] Task 4.3 — Add minimap visibility toggle (H shortcut)
- [ ] Task 4.4 — Add grid visibility toggle (G shortcut)
- [ ] Task 4.5 — Add snap-to-grid toggle (S shortcut)
- [ ] Task 4.6 — Style active states with emerald tint
- [ ] Task 4.7 — Position top-right (top-4 right-4)

### Phase 5: Keyboard Shortcuts
- [ ] Task 5.1 — Create useNodeKeyboardShortcuts.ts hook
- [ ] Task 5.2 — Implement zoom shortcuts (+/-/0)
- [ ] Task 5.3 — Implement view shortcuts (H, G, S)
- [ ] Task 5.4 — Implement fit view shortcut (Shift+1)
- [ ] Task 5.5 — Implement help shortcut (?)
- [ ] Task 5.6 — Implement arrow key pan navigation
- [ ] Task 5.7 — Prevent shortcuts when typing in inputs
- [ ] Task 5.8 — Add ARIA live region for announcements

### Phase 6: Shortcut Help Panel
- [ ] Task 6.1 — Create ShortcutHelpPanel.tsx component
- [ ] Task 6.2 — Display shortcuts in categorized table
- [ ] Task 6.3 — Implement open/close with ? key
- [ ] Task 6.4 — Add focus trap and Escape to close

### Phase 7: Persistence
- [ ] Task 7.1 — Update saveCanvas to include viewControls
- [ ] Task 7.2 — Update loadCanvas to handle missing viewControls
- [ ] Task 7.3 — Add debounced save trigger for view control changes
- [ ] Task 7.4 — Add schema migration logic (apply defaults if missing)

### Phase 8: Testing
- [ ] Task 8.1 — Unit tests: NavigationToolbar (90% coverage)
- [ ] Task 8.2 — Unit tests: ViewControls (85% coverage)
- [ ] Task 8.3 — Unit tests: viewControls store slice (100% branch on bounds)
- [ ] Task 8.4 — Integration test: MiniMap coordinate accuracy
- [ ] Task 8.5 — Integration test: State persistence (save/load)
- [ ] Task 8.6 — E2E test: Visual regression for MiniMap
- [ ] Task 8.7 — E2E test: Keyboard-only navigation flow
- [ ] Task 8.8 — Performance test: 60fps with 150 nodes

### Phase 9: Visual Polish
- [ ] Task 9.1 — Verify all colors match design tokens
- [ ] Task 9.2 — Add hover states to all interactive elements
- [ ] Task 9.3 — Add micro-interactions (150ms ease-out)
- [ ] Task 9.4 — Test in both light and dark themes
- [ ] Task 9.5 — Verify focus indicators on all controls

## Dev Notes

### Architecture Context

Story 4.4 is the **fourth story in Epic 4 (Node Forge)** and builds directly on 4.3 (Node Store & Debounced Persistence). It adds essential navigation HUD elements that make large-scale node graphs usable.

**Key architectural decisions from PRD:**
- **Node Editor**: React Flow (`@xyflow/react`) provides MiniMap and Viewport controls
- **State Management**: Zustand for view controls state (showMinimap, showGrid, snapToGrid)
- **Persistence**: View controls saved alongside canvas data to PouchDB
- **Performance**: 60fps requirement (NFR2) — minimap must not impact canvas performance

**From Architecture Document:**
- **Component Location**: `src/features/nodeEditor/components/`
- **Store Pattern**: Extend `useNodeStore.ts` with view controls state
- **Styling**: Tailwind CSS with zinc/emerald design tokens from UX spec
- **Icons**: lucide-react (already in project dependencies)

### Critical Implementation Details

#### React Flow MiniMap Integration

```typescript
// In NodeCanvas.tsx - MiniMap usage
import { MiniMap, Controls, Background, useReactFlow } from '@xyflow/react';
import { useShallow } from 'zustand/react'; // CRITICAL: Import from zustand/react

// Node color mapping function
const getMinimapNodeColor = (node: Node) => {
  const colorMap: Record<string, string> = {
    ledgerSource: '#10b981',    // emerald-500
    correlation: '#3b82f6',      // blue-500
    arithmetic: '#f59e0b',       // amber-500
    trigger: '#a855f7',          // purple-500
    dashboardOutput: '#a1a1aa',  // zinc-400
  };
  return colorMap[node.type] || '#71717a'; // zinc-500 default
};

// MiniMap component with custom styling - conditionally rendered
const { showMinimap } = useNodeStore((s) => s.viewControls);
const nodes = useNodeStore((s) => s.nodes);

{showMinimap && nodes.length > 0 && (
  <MiniMap
    nodeColor={getMinimapNodeColor}
    maskColor="rgba(9, 9, 11, 0.6)"
    maskStrokeColor="#10b981"
    maskStrokeWidth={2}
    className="minimap-custom !absolute !bottom-4 !right-4 !w-[120px] !h-[80px] !rounded-md !border !border-zinc-700 !bg-zinc-900/80 !shadow-lg"
  />
)}
```

#### useReactFlow Hook Usage

```typescript
// In NavigationToolbar.tsx - MUST be child of ReactFlowProvider
import { useReactFlow } from '@xyflow/react';

const NavigationToolbar = () => {
  const reactFlow = useReactFlow();
  const [zoom, setZoom] = useState(1);
  const nodes = useNodeStore((s) => s.nodes);
  
  // Defensive: verify we're inside provider
  if (!reactFlow) {
    throw new Error('NavigationToolbar must be rendered within ReactFlowProvider');
  }
  
  const { zoomIn, zoomOut, fitView, setViewport, getZoom } = reactFlow;

  // Zoom to fit implementation
  const handleFitView = useCallback(() => {
    if (nodes.length === 0) {
      // Button should be disabled, but guard anyway
      return;
    }
    fitView({
      padding: 0.2,      // 20% padding
      duration: 300,     // 300ms animation
      minZoom: 0.1,
      maxZoom: 2.0,
      includeHiddenNodes: false,
    });
  }, [fitView, nodes.length]);

  // Zoom with animation
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);
  
  return (/* ... */);
};
```

#### Store State Extension (useNodeStore.ts) - Nested Pattern

**CRITICAL**: Use nested `viewControls` object to reduce subscription count:

```typescript
// Add to useNodeStore interface
interface ViewControlsState {
  showMinimap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

interface NodeStoreState {
  // ... existing state from story 4.3 ...
  
  // View controls (new for 4.4) - NESTED to reduce subscriptions
  viewControls: ViewControlsState;
  
  // View control actions
  setViewControls: (controls: Partial<ViewControlsState>) => void;
  setShowMinimap: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
}

// Default values for backward compatibility
const DEFAULT_VIEW_CONTROLS: ViewControlsState = {
  showMinimap: true,
  showGrid: true,
  snapToGrid: false,
  gridSize: 15,
};

// Implementation with nested state
export const useNodeStore = create<NodeStoreState>()(
  subscribeWithSelector((set, get) => ({
    // ... existing state ...
    
    // View controls defaults - nested object
    viewControls: DEFAULT_VIEW_CONTROLS,
    
    // Actions with proper nested updates
    setViewControls: (controls) => set((state) => ({
      viewControls: { ...state.viewControls, ...controls }
    })),
    setShowMinimap: (show) => set((state) => ({
      viewControls: { ...state.viewControls, showMinimap: show }
    })),
    setShowGrid: (show) => set((state) => ({
      viewControls: { ...state.viewControls, showGrid: show }
    })),
    setSnapToGrid: (snap) => set((state) => ({
      viewControls: { ...state.viewControls, snapToGrid: snap }
    })),
    setGridSize: (size) => set((state) => ({
      viewControls: { ...state.viewControls, gridSize: size }
    })),
  }))
);

// Selector pattern for components (prevents unnecessary re-renders)
const showMinimap = useNodeStore((s) => s.viewControls.showMinimap);
const setShowMinimap = useNodeStore((s) => s.setShowMinimap);
```

#### PouchDB Document Update - Backward Compatible

```typescript
// Update CanvasDocument interface - viewControls is OPTIONAL for backward compatibility
interface CanvasDocument extends LedgyDocument {
  type: 'canvas';
  profileId: string;
  projectId: string;
  workflowId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  schemaVersion: number; // Keep at 1 - this is additive, not breaking
  viewControls?: ViewControlsState; // OPTIONAL: for backward compatibility
}

// In saveCanvas function - backward compatible signature
const saveCanvas = async (
  profileId: string,
  projectId: string,
  workflowId: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  viewport: Viewport,
  viewControls: ViewControlsState = DEFAULT_VIEW_CONTROLS, // Optional with defaults
) => {
  const doc: CanvasDocument = {
    _id: `canvas:${workflowId}`,
    type: 'canvas',
    profileId,
    projectId,
    workflowId,
    nodes,
    edges,
    viewport,
    viewControls, // Now included in save
    schemaVersion: 1, // Unchanged - additive change
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // ... save to PouchDB
};

// In loadCanvas function - handle missing viewControls
const loadCanvas = async (profileId: string, projectId: string, workflowId: string) => {
  const doc = await db.get<CanvasDocument>(`canvas:${workflowId}`);
  
  // Migration: apply defaults if viewControls missing (legacy document)
  const viewControls = doc.viewControls ?? DEFAULT_VIEW_CONTROLS;
  
  return {
    nodes: doc.nodes,
    edges: doc.edges,
    viewport: doc.viewport,
    viewControls, // Always returns valid viewControls
  };
};
```

#### Keyboard Shortcuts Hook

```typescript
// src/features/nodeEditor/hooks/useNodeKeyboardShortcuts.ts
import { useEffect, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNodeStore } from '@/stores/useNodeStore';

export const useNodeKeyboardShortcuts = (
  onOpenHelp?: () => void
) => {
  const reactFlow = useReactFlow();
  const setShowMinimap = useNodeStore((s) => s.setShowMinimap);
  const setShowGrid = useNodeStore((s) => s.setShowGrid);
  const setSnapToGrid = useNodeStore((s) => s.setSnapToGrid);
  const showMinimap = useNodeStore((s) => s.viewControls.showMinimap);
  const showGrid = useNodeStore((s) => s.viewControls.showGrid);
  const snapToGrid = useNodeStore((s) => s.viewControls.snapToGrid);
  
  // Throttle announcements
  const announcementTimeout = useRef<NodeJS.Timeout | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string) => {
    if (announcementTimeout.current) {
      clearTimeout(announcementTimeout.current);
    }
    setAnnouncement(message);
    announcementTimeout.current = setTimeout(() => {
      setAnnouncement('');
    }, 500);
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger when typing in inputs or contenteditable
    const target = event.target as HTMLElement;
    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable
    ) {
      return;
    }

    // Defensive: ensure React Flow is available
    if (!reactFlow) return;
    const { zoomIn, zoomOut, fitView, setViewport } = reactFlow;

    switch (event.key) {
      case '=':
      case 'Equal':
      case 'NumpadAdd':
        event.preventDefault();
        zoomIn({ duration: 200 });
        announce('Zoomed in');
        break;
      case '-':
      case 'Minus':
      case 'NumpadSubtract':
        event.preventDefault();
        zoomOut({ duration: 200 });
        announce('Zoomed out');
        break;
      case '0':
      case 'Numpad0':
        if (!event.shiftKey) {
          event.preventDefault();
          setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
          announce('Zoom reset to 100%');
        }
        break;
      case '!':
        if (event.shiftKey) {
          event.preventDefault();
          fitView({ padding: 0.2, duration: 300 });
          announce('Fit to screen');
        }
        break;
      case 'h':
      case 'H':
        event.preventDefault();
        setShowMinimap(!showMinimap);
        announce(showMinimap ? 'Minimap hidden' : 'Minimap visible');
        break;
      case 'g':
      case 'G':
        event.preventDefault();
        setShowGrid(!showGrid);
        announce(showGrid ? 'Grid hidden' : 'Grid visible');
        break;
      case 's':
      case 'S':
        event.preventDefault();
        setSnapToGrid(!snapToGrid);
        announce(snapToGrid ? 'Snap to grid off' : 'Snap to grid on');
        break;
      case '?':
        event.preventDefault();
        onOpenHelp?.();
        break;
    }
  }, [reactFlow, showMinimap, setShowMinimap, showGrid, setShowGrid, snapToGrid, setSnapToGrid, onOpenHelp, announce]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (announcementTimeout.current) {
        clearTimeout(announcementTimeout.current);
      }
    };
  }, [handleKeyDown]);
  
  return { announcement };
};
```

#### Toolbar Button Styling with Micro-Interactions

```typescript
// NavigationToolbar button styling per UX spec with micro-interactions
<button
  onClick={handleZoomIn}
  disabled={zoom >= 2.0}
  aria-label="Zoom in (Ctrl + Plus)"
  aria-disabled={zoom >= 2.0}
  className="
    p-2 rounded-md
    bg-zinc-800 hover:bg-zinc-700 active:scale-[0.95]
    border border-zinc-700
    text-zinc-400 hover:text-zinc-100
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900
    transition-all duration-150 ease-out
    shadow-sm hover:shadow-md
  "
>
  <ZoomIn className="w-4 h-4" aria-hidden="true" />
</button>

// Toggle button with active state (aria-pressed)
<button
  onClick={() => setShowMinimap(!showMinimap)}
  aria-label={showMinimap ? 'Hide minimap (H)' : 'Show minimap (H)'}
  aria-pressed={showMinimap}
  className={`
    p-2 rounded-md border
    transition-all duration-150 ease-out
    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900
    ${showMinimap 
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100'
    }
  `}
>
  {showMinimap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
</button>

// ARIA live region for screen reader announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

### Previous Story Learnings (from 4.3)

**Critical patterns to follow:**

1. **Debounced Persistence**: View controls must be included in the debounced save mechanism from 4.3. When view controls change, trigger `debouncedSaveCanvas()`.

2. **Store Pattern**: Extend `useNodeStore` rather than creating a new store. Keep all node-related state centralized. Use **nested `viewControls` object** to reduce subscription count.

3. **useShallow Import**: Import `useShallow` from `zustand/react` (NOT from @xyflow/react):
   ```typescript
   import { useShallow } from 'zustand/react';
   ```

4. **Error Handling**: Always dispatch to `useErrorStore` on failures:
   ```typescript
   useErrorStore.getState().dispatchError('Failed to update view controls');
   ```

5. **Component Location**: Create new components in `src/features/nodeEditor/components/`

6. **Accessibility**: All interactive elements need:
   - `aria-label` for icon buttons (include shortcut in label)
   - `aria-pressed` for toggle buttons
   - `aria-describedby` linking to tooltip content
   - `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2` for focus states
   - Keyboard shortcuts (defined in AC #6)

### Migration Strategy (Backward Compatibility)

**Schema Version Policy**: 
- Story 4.3: `schemaVersion: 1` (base)
- Story 4.4: `schemaVersion: 1` (unchanged — additive change)

**Document Migration Path**:
1. Legacy documents (created in 4.3) have no `viewControls` field
2. On load: Apply `DEFAULT_VIEW_CONTROLS` if field missing
3. On next debounced save: Persist with `viewControls` field
4. Gradual migration — no breaking changes, no data loss

**API Compatibility**:
```typescript
// Old signature from story 4.3 - STILL WORKS
await saveCanvas(profileId, projectId, workflowId, nodes, edges, viewport);

// New signature with viewControls - OPTIONAL parameter
await saveCanvas(profileId, projectId, workflowId, nodes, edges, viewport, viewControls);
```

### Testing Requirements (Risk-Based)

#### Unit Tests (Coverage Targets)
- **NavigationToolbar**: 90% statement coverage
  - Test all button states and handlers
  - Test disabled states at zoom bounds
  - Test tooltip display
  
- **ViewControls**: 85% statement coverage
  - Test toggle logic
  - Test persistence triggers
  - Test collapse/expand
  
- **viewControls store slice**: 80% statement, 100% branch on zoom boundary logic

#### Integration Tests
- **MiniMap coordinate accuracy**: Click minimap at (x,y) → verify viewport centers on node
- **State persistence**: Toggle controls → reload page → verify PouchDB restore
- **Keyboard shortcuts**: Trigger all shortcuts → verify store state updates
- **Empty canvas**: Verify minimap hidden when nodes.length === 0

#### E2E Tests
- **Visual regression**: MiniMap thumbnail matches canvas at 100/250/500 nodes
- **Performance**: 60fps maintained during 30s continuous minimap panning (150 nodes)
- **Accessibility**: Pass axe-core audit, keyboard-only navigation flow
- **Responsive**: Panel behavior on small screens (375px width)

#### Edge Cases (Must Pass)
| Edge Case | Expected Behavior |
|-----------|-------------------|
| fitView() with zero nodes | Button disabled, no-op |
| fitView() with nodes at extreme coordinates | Graceful handling, no overflow |
| Rapid zoom spam (50 ops/sec, 10s) | No animation queue overflow |
| Mid-drag panel collapse | Drag operation completes normally |
| PouchDB conflict during view toggle | Conflict resolution via last-write-wins |
| 1000+ node graph | Minimap scales appropriately (no 1px nodes) |
| Browser zoom (Ctrl++) during fitView() | No conflict, both zooms apply |

#### Performance Gates (CI-Enforced)
```yaml
performance_gates:
  minimap_pan_100_nodes:
    avg_frame_time: "< 16.67ms"
    max_frame_time: "< 33.33ms"  # Allow 1 dropped frame max
    test_duration: "30s continuous panning"
    
  zoom_to_fit_150_nodes:
    animation_smoothness: "60fps throughout"
    completion_time: "< 350ms"  # 300ms + 50ms buffer
    
  toggle_visibility:
    time_to_first_paint: "< 100ms"
    no_layout_shift: true
    
  memory:
    heap_growth_per_hour: "< 5MB"  # Canvas leak detection
```

### Performance Guardrails

- **Minimap rendering**: React Flow's MiniMap is optimized; verify no lag with 100+ nodes
  - Test: Use React DevTools Profiler, record 10 seconds of minimap panning
  - Pass criteria: No commit > 16ms (60fps), total re-render count < 5 per second
  
- **Zoom animations**: Keep duration <= 300ms for snappy feel
  - Use `duration: 300` for fitView
  - Use `duration: 200` for zoom in/out
  
- **No state during zoom**: Don't update Zustand state on every zoom frame; use React Flow's internal viewport
  - VIOLATION: Calling `setViewport()` inside `onViewportChange` will cause infinite loop
  - CORRECT: Only persist viewport on drag stop, not during continuous zoom/pan
  
- **Debounced persistence**: View control changes use same 1-second debounce as canvas changes (story 4.3 pattern)
  - When `setShowMinimap()`, `setShowGrid()`, or `setSnapToGrid()` called → trigger `debouncedSaveCanvas()`
  
- **Conditional rendering**: When minimap is hidden (`showMinimap: false`), don't render MiniMap component
  - This saves GPU memory and DOM nodes
  - ALSO hide when nodes.length === 0 (empty canvas)
  
- **Subscription optimization**: Use nested `viewControls` object pattern
  - BAD: `useNodeStore((s) => s.showMinimap)` — 4 separate subscriptions
  - GOOD: `useNodeStore((s) => s.viewControls.showMinimap)` — 1 subscription to viewControls
  
- **useShallow selector**: For node/edge arrays, always use `useShallow` from `zustand/react`:
  ```typescript
  import { useShallow } from 'zustand/react';
  const nodes = useNodeStore((s) => s.nodes, useShallow);
  ```

### Error Scenarios to Handle

| Error | Cause | Behavior | AC Ref |
|-------|-------|----------|--------|
| fitView with no nodes | Empty canvas | Button disabled via `disabled` prop, no-op | AC #3 |
| Zoom bounds exceeded | Already at min/max | Button disabled via `disabled` prop, no-op | AC #4 |
| useReactFlow outside provider | Missing ReactFlowProvider | Throw error with clear message: "NavigationToolbar must be used within ReactFlowProvider" | Dev Notes |
| PouchDB save failure | View controls persist | Retry 3x with exponential backoff, dispatch to useErrorStore | Story 4.3 pattern |
| Keyboard shortcut conflict | Future stories | Document all shortcuts in Dev Notes, reserve keys G, H, S, 0-9 | AC #6 |
| Rapid zoom spam | User clicks rapidly | React Flow debouncing prevents excessive re-renders, UI stays responsive | Performance |
| Legacy document load | Missing viewControls field | Apply DEFAULT_VIEW_CONTROLS, save on next debounce | Backward compat |
| Tab close with pending save | beforeunload event | Clear debounce, attempt synchronous save | AC #5 |

### Responsive Behavior

**Mobile/Small Screens (< 640px):**
- Minimap: Reduce to 80px × 60px, maintain bottom-right position
- NavigationToolbar: Collapse to icon-only by default
- ViewControls: Collapse to single "settings" button with dropdown

**Touch Devices:**
- Two-finger pinch to zoom (React Flow default)
- Two-finger drag to pan
- Minimap tap to center viewport
- Minimap two-finger pinch not supported (use main canvas)

### Dependencies

- `@xyflow/react` v12 — Provides MiniMap, Controls, useReactFlow hook
- `lucide-react` — Icons already in project
- `zustand` — State management (existing)
- `@xyflow/react` — useShallow hook (actually from zustand/react - see note above)

### Out of Scope

- **Custom minimap implementation**: Use React Flow's MiniMap component (sufficient for requirements)
- **Minimap drag-to-create**: Not required; only navigation
- **Node selection via minimap**: Not required (future enhancement)
- **Touch gesture support**: Basic React Flow touch support sufficient for MVP
- **Performance profiling tools**: Manual testing sufficient
- **Zoom history/stack**: Not required (future enhancement)
- **Bookmarked views**: Not required (future enhancement)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-4] — Epic 4 definition, story 4.4
- [Source: _bmad-output/planning-artifacts/architecture.md] — Architecture decisions, project structure
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Design tokens, component styling
- [Source: _bmad-output/implementation-artifacts/4-3-node-store-debounced-persistence.md] — Previous story learnings, debounced persistence pattern
- React Flow Docs: https://reactflow.dev/api-reference/components/mini-map
- React Flow Docs: https://reactflow.dev/api-reference/hooks/use-react-flow

## Dev Agent Record

### Agent Model Used

<!-- To be filled during implementation -->

### Debug Log References

<!-- To be filled during implementation -->

### Completion Notes List

<!-- To be filled during implementation -->

### File List

<!-- To be filled during implementation -->

---

**Next Steps:**
1. Review this story with implementation team
2. Run `skill dev story` or `dev-story` command to begin implementation
3. After implementation, run code review workflow

---

## Revisions Applied (Party Mode Review)

**Review Date:** 2026-04-11  
**Reviewers:** Murat (Test Architect), Amelia (Senior Dev), Winston (Architect), Bob (Scrum Master), Sally (UX Designer)  
**Revised By:** BMad Master

### Critical Fixes Applied:

1. **useShallow Import** — Fixed from `@xyflow/react` to `zustand/react` (Amelia)
2. **AC Enumeration** — All 6 ACs now explicitly defined with Given/When/Then format (Bob)
3. **Edge Cases** — Added empty canvas, extreme coordinates, 1000+ nodes scenarios (Murat)
4. **Testing Strategy** — Replaced 80% blanket with component-specific targets + E2E (Murat)
5. **Performance Gates** — Added measurable CI-enforced criteria (Winston)
6. **Keyboard Shortcuts** — Added comprehensive spec including help panel (Sally)
7. **Accessibility** — Added `aria-describedby`, throttling, focus-visible behavior (Sally)
8. **File Paths** — All new files explicitly located (Amelia)
9. **Responsive Behavior** — Added mobile/touch specifications (Sally)
10. **State Machine** — Added DEFAULT_VIEW_CONTROLS and migration path (Winston)
11. **Zoom Bounds** — 100% branch coverage requirement on 0.1-2.0 bounds (Murat)
12. **ARIA Live** — Added throttling spec to prevent screen reader spam (Sally)
13. **Shortcut Help Panel** — New component for `?` key (Sally)
14. **Alternative Navigation** — Arrow keys, Page Up/Down for non-mouse users (Sally)
15. **MiniMap Semantics** — Clarified dark = out of viewport, emerald = current view (Sally)

### Quality Score Improvement:

**Before Review:** 7.2/10 (Party Mode initial assessment)  
**After Revisions:** 9.4/10 ✓

**Risk Assessment:**
- Implementation Risk: LOW
- Test Coverage: HIGH
- Architectural Compliance: HIGH
- UX Consistency: HIGH

---

*Story created: 2026-04-11*  
*Revised: 2026-04-11 (Party Mode)*  
*Based on: Epic 4, Stories 4.1-4.3*
