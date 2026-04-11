# Story 4.9: Sub-Graph Container Grouping

Status: ready-for-dev

<!--
Story Context: Comprehensive developer guide for sub-graph container grouping
Based on: Epic 4 Node Forge, Stories 4.1-4.8
Dependencies: 4-2 (React Flow Canvas), 4-3 (Node Store), 4-7 (Edge Connection), 4-8 (Type Validation)

REVIEW APPLIED: 2026-04-12 — Party Mode Multi-Agent Review
Fixes applied:
- Coverage targets aligned to 85%/85%/80%/80%
- Removed originalConnections storage (calculate dynamically)
- Switched to React Flow native selectionOnDrag (removed custom lasso)
- Added "no nesting" validation AC
- Added accessibility requirements (ARIA, focus management, reduced motion)
- Fixed TypeScript issues (extent property, type discriminator)
- Added missing test categories (visual regression, a11y, performance)
- Added container validation and integrity checks
- Added CSS animation definitions
- Updated file structure (removed LassoSelection.tsx)
-->

## Story

As a Node Forge user,
I want to select multiple nodes and group them into a collapsible container,
so that I can organize complex workflows, reduce visual clutter, and work with higher-level abstractions.

**Story Points:** 5 (M-L) ~3-5 days
**Complexity:** Medium-High (React Flow parent/child nodes, coordinate transforms, state management)

## Definition of Done

- [ ] All 7 acceptance criteria implemented and verified
- [ ] Users can select multiple nodes via Shift+click or lasso selection
- [ ] Selected nodes can be grouped into a collapsible container node
- [ ] Container expands/collapses while preserving internal connections
- [ ] Visual design matches UX specification (zinc dark theme, emerald accents)
- [ ] Grouped nodes persist to PouchDB with proper document structure
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.8 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: Container logic 85%, Grouping operations 85%, Selection system 80%, Connection utilities 80%
- [ ] Integration test coverage: Container persistence 80%
- [ ] Visual regression tests pass for all container states (collapsed, expanded, selected)
- [ ] Accessibility tests pass: keyboard navigation (Tab, Space, Escape, Ctrl+G)
- [ ] Performance: Group 20 nodes <100ms, 50 nodes <200ms, expand/collapse 60fps
- [ ] E2E tests pass for grouping, ungrouping, and expand/collapse flows
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Prerequisites

- **Story 4-2 (React Flow Canvas Core)** - MUST be completed. Provides canvas foundation.
- **Story 4-3 (Node Store & Debounced Persistence)** - MUST be completed. Provides node CRUD and persistence.
- **Story 4-7 (Complex Edge Connection Snapping)** - MUST be completed. Provides edge/connection foundation.
- **Story 4-8 (Strict Edge Type Validation)** - SHOULD be completed. Connection validation patterns.
- **React Flow Version** - MUST be v12+. Verify sub-flow/parent node support.
- **Node Types Available** - Ledger Source (4-5), Correlation/Arithmetic (4-6) should exist.

## Acceptance Criteria

### AC1: Multi-Node Selection
**Given** the user is working in the Node Forge canvas  
**When** they want to select multiple nodes  
**Then** the system supports two selection methods:

**Selection Method 1: Shift+Click Multi-Select**
| Action | Behavior |
|--------|----------|
| Shift+Click on unselected node | Add to selection (multi-select mode) |
| Shift+Click on selected node | Remove from selection |
| Click without Shift | Clear selection, select single node |
| Escape key | Clear all selections |

**Selection Method 2: Lasso Selection**
| Action | Behavior |
|--------|----------|
| Drag on empty canvas (no node) | Initiate lasso selection box |
| Nodes within box on release | Added to selection |
| Shift+Drag | Add to existing selection |
| Min box size | 40x40px (prevent accidental triggers) |

**Visual Selection Indicators:**
| State | Visual |
|-------|--------|
| Single selected | Emerald-500 ring (2px), subtle shadow |
| Multi-selected | Same + "{N} selected" badge bottom-left |
| Selection box | Zinc-400 dashed border, zinc-800/30 fill |

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| `Ctrl+A` / `Cmd+A` | Select all nodes |
| `Escape` | Clear selection |
| `Delete` | Delete selected nodes (with confirmation if >1) |
| `Ctrl+G` / `Cmd+G` | Group selected nodes into container |

### AC2: Group Creation
**Given** the user has multiple nodes selected (2+)  
**When** they trigger the group action  
**Then** the system creates a Sub-Graph Container:

**Group Trigger Methods:**
| Method | Trigger |
|--------|---------|
| Keyboard | `Ctrl+G` / `Cmd+G` |
| Context Menu | Right-click → "Group {N} nodes" |
| Toolbar | Group button (visible when multi-selection active) |

**Container Node Properties:**
```typescript
interface ContainerNodeData {
  type: 'container';                // Type discriminator for runtime narrowing
  label: string;                    // Default: "Group" or user-defined
  isCollapsed: boolean;             // Expand/collapse state
  childNodeIds: string[];           // IDs of contained nodes
  createdAt: string;                // ISO 8601 timestamp
  // Note: Internal connections are calculated dynamically from edges array
  // Do NOT store originalConnections in container data (avoid duplication)
}
```

**Group Creation Behavior:**
1. **Validate**: Ensure selected nodes are not already children of another container (prevent nesting)
2. Calculate bounding box of all selected nodes (with 40px padding)
3. Create container node at bounding box position
4. Reparent child nodes to container (set `parentNode` property)
5. Recalculate child node positions relative to container origin
6. Preserve external connections (to outside the group) as container ports
7. Auto-label: "Group" or "Group {N}" if multiple groups exist

**Nesting Prevention:**
| Scenario | Behavior |
|----------|----------|
| User selects node already in container | "Cannot group: node already in a container" toast |
| User attempts to drag container into another | Visual "no nesting" feedback (red border) |
| Multi-select includes nodes from different containers | "Cannot group: nodes from different containers" toast |

**Visual Container Appearance:**
| Element | Style |
|---------|-------|
| Container header | Zinc-800 background, border-b zinc-700 |
| Label | Text input (inline editable), zinc-100 |
| Collapse button | Chevron icon, right side of header |
| Container body | Zinc-900/50 fill when expanded, hidden when collapsed |
| Border | Zinc-700 (1px), emerald-500 (2px) when selected |
| Resize handles | 8px squares at corners (optional - Phase 2) |

**Container Dimensions:**
- Minimum: 200x150px (expanded), 160x40px (collapsed)
- Padding: 20px around child nodes
- Auto-grows: To fit children when nodes expand

### AC3: Expand/Collapse Behavior
**Given** a container node exists on the canvas  
**When** the user interacts with it  
**Then** the container expands/collapses:

**Expand/Collapse Triggers:**
| Action | Result |
|--------|--------|
| Click chevron icon | Toggle expand/collapse |
| Double-click header | Toggle expand/collapse |
| `Space` key (when focused) | Toggle expand/collapse |

**Accessibility Requirements:**
- Container header must be keyboard focusable (Tab navigation)
- Focus indicator: 2px emerald-500 ring, offset-2 (per UX spec)
- `aria-expanded` attribute reflects collapse state
- `aria-label` uses container label text (e.g., "Group: My Container")
- `aria-controls` links header to container content
- Screen reader announces expand/collapse state changes
- Respect `prefers-reduced-motion`: disable animations when user prefers reduced motion

**Expanded State:**
- Child nodes visible and editable
- Internal connections rendered
- Container size fits children + padding
- Full interaction available (drag, connect, configure)

**Collapsed State:**
- Child nodes hidden (not rendered)
- Internal connections hidden
- Container shows mini-preview or icon representation
- Only container-level interactions available (move, delete, rename)
- External connections visible as ports on container edges

**Collapse Animation:**
| Phase | Duration | Visual |
|-------|----------|--------|
| 1. Children fade | 150ms | Opacity 1→0 |
| 2. Container shrinks | 200ms | Spring animation to collapsed size |
| 3. Chevron rotates | 200ms | 0°→-90° (counter-clockwise) |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth deceleration |

**Expand Animation:**
| Phase | Duration | Visual |
|-------|----------|--------|
| 1. Container grows | 200ms | Spring animation to expanded size |
| 2. Chevron rotates | 200ms | -90°→0° |
| 3. Children fade in | 150ms | Opacity 0→1 |

### AC4: Internal Connection Preservation
**Given** nodes have connections within a group  
**When** the container expands/collapses or moves  
**Then** internal connections remain intact:

**Internal vs External Connections:**
```typescript
// Internal: Both source and target are in the same container
const isInternalConnection = (edge: Edge, containerId: string): boolean => {
  const container = nodes.find(n => n.id === containerId);
  if (!container || !container.data?.childNodeIds) return false;
  
  const childIds = container.data.childNodeIds;
  return childIds.includes(edge.source) && childIds.includes(edge.target);
};

// External: One end is inside, one end is outside
const isExternalConnection = (edge: Edge, containerId: string): boolean => {
  const container = nodes.find(n => n.id === containerId);
  if (!container || !container.data?.childNodeIds) return false;
  
  const childIds = container.data.childNodeIds;
  const sourceIn = childIds.includes(edge.source);
  const targetIn = childIds.includes(edge.target);
  return (sourceIn && !targetIn) || (!sourceIn && targetIn);
};
```

**Connection Rendering by Container State:**
| Connection Type | Expanded | Collapsed |
|-----------------|----------|-----------|
| Internal | Fully rendered | Hidden |
| External (outgoing) | Normal edge from source node | Edge from container port |
| External (incoming) | Normal edge to target node | Edge to container port |

**Container Ports for External Connections:**
- When collapsed, external connections attach to container edges
- Port position: Calculated based on original handle position relative to container bounds
- Visual: Small handle indicator on container border (color-coded by type)
- Label: Shows original field name on hover

### AC5: Container Movement
**Given** a container is on the canvas  
**When** the user drags it  
**Then** the container and all children move together:

**Drag Behavior:**
| Container State | Drag Result |
|-----------------|-------------|
| Collapsed | Moves as single unit (children hidden) |
| Expanded | Container + all children move together |
| Multi-selected | All selected containers move together |

**Child Node Position Management:**
```typescript
// When container moves, children maintain relative positions
// React Flow's parentNode system handles this automatically
// Container position = absolute canvas coordinates
// Child position = relative to parent origin

interface NodePosition {
  x: number;  // Absolute (if no parent) or relative (if has parentNode)
  y: number;
}
```

**Drag Constraints:**
- Container cannot be dragged inside another container (no nesting)
- Children cannot be dragged outside container bounds (constrained drag)
- Shift+drag container: Free drag without constraints

### AC6: Ungroup Operation
**Given** a container exists on the canvas  
**When** the user triggers ungroup  
**Then** the system dissolves the container and restores child nodes:

**Ungroup Triggers:**
| Method | Trigger |
|--------|---------|
| Keyboard | `Ctrl+Shift+G` / `Cmd+Shift+G` |
| Context Menu | Right-click container → "Ungroup" |
| Toolbar | Ungroup button (when container selected) |
| Auto | When deleting container (with confirmation) |

**Ungroup Behavior:**
1. Convert child node positions from relative to absolute coordinates
2. Remove `parentNode` reference from all children
3. Internal connections remain intact (edges reference node IDs, not container)
4. External connections remain attached to appropriate nodes
5. Delete container node
6. Select all former child nodes

**Note:** Connections are NOT stored in container data. Edge relationships persist because edges reference node IDs directly. When container is removed, edges automatically reconnect to child nodes.

**Position Calculation:**
```typescript
// Convert relative to absolute positions
const ungroupPositions = (
  container: Node,
  children: Node[]
): Node[] => {
  return children.map(child => ({
    ...child,
    position: {
      x: container.position.x + child.position.x,
      y: container.position.y + child.position.y,
    },
    parentNode: undefined,
    // Remove extent constraint (was 'parent')
  }));
};
```

### AC7: Persistence & State Management
**Given** containers exist in a workflow  
**When** the workflow is saved and reloaded  
**Then** the container state is preserved:

**PouchDB Document Structure:**
```typescript
// Container node document
interface ContainerNodeDocument extends LedgyDocument {
  type: 'node';
  nodeType: 'container';
  data: {
    type: 'container';
    label: string;
    isCollapsed: boolean;
    childNodeIds: string[];
    createdAt: string;
    // Note: Internal connections are derived from edges array
    // Do NOT duplicate edge data in container document
  };
  position: { x: number; y: number };
  style?: {
    width?: number;
    height?: number;
  };
}

// Child nodes maintain parentNode reference
interface ChildNodeDocument extends LedgyDocument {
  type: 'node';
  parentNode: string;  // Container node ID
  position: { x: number; y: number };  // Relative to parent
}
```

**Save Triggers:**
| Action | Trigger |
|--------|---------|
| Group created | Immediate save (new container + updated children) |
| Expand/collapse | State change → debounced save |
| Container moved | `onNodeDragStop` → debounced save (story 4.3 pattern) |
| Ungroup | Immediate save (removed container + updated children) |
| Label edited | `onBlur` → debounced save |

**Zustand Store Updates:**
```typescript
// Add to useNodeStore.ts
interface NodeStoreState {
  // ... existing state
  
  // Container-specific actions
  groupNodes: (nodeIds: string[], label?: string) => string;  // Returns container ID
  ungroupNodes: (containerId: string) => void;
  expandContainer: (containerId: string) => void;
  collapseContainer: (containerId: string) => void;
  setContainerLabel: (containerId: string, label: string) => void;
}
```

## Type Definitions

```typescript
// Container-specific types (extends types from 4.3, 4.6)

// Note: ContainerNodeData is defined in AC2 with type discriminator
// Use that definition as the canonical source

interface ContainerNodeData {
  type: 'container';                // Type discriminator
  label: string;
  isCollapsed: boolean;
  childNodeIds: string[];
  createdAt: string;                // ISO 8601
}

// Selection state
interface SelectionState {
  selectedNodeIds: string[];
  isMultiSelectMode: boolean;
}

// Container bounds for layout calculations
interface ContainerBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// React Flow node type extensions
type CustomNodeType = 'ledgerSource' | 'correlation' | 'arithmetic' | 'container';

interface CustomNode extends Node {
  type: CustomNodeType;
  parentNode?: string;
  data: LedgerSourceNodeData | CorrelationNodeData | ArithmeticNodeData | ContainerNodeData;
}
```

## Tasks / Subtasks

### Phase 1: Selection System
- [ ] Task 1.1 — Create `src/features/nodeEditor/hooks/useNodeSelection.ts`
  - [ ] Use React Flow's `onSelectionChange` as source of truth
  - [ ] Track selected node IDs in local state (sync from React Flow)
  - [ ] Implement Shift+click multi-select logic (React Flow native)
  - [ ] Implement `Ctrl+A` select all
  - [ ] Selection state management (add/remove/toggle)
- [ ] Task 1.2 — Configure React Flow native selection
  - [ ] Enable `selectionOnDrag={true}` in NodeCanvas.tsx
  - [ ] Set `selectionMode={SelectionMode.Full}`
  - [ ] Style selection box via CSS (zinc-400 dashed, zinc-800/30 fill)
  - [ ] Min size threshold: 40x40px (via React Flow config or CSS)
- [ ] Task 1.3 — Add selection visual indicators
  - [ ] Update existing node components with selection ring (emerald-500)
  - [ ] Create `SelectionBadge.tsx` for "{N} selected" indicator
  - [ ] Add keyboard shortcuts (Escape to clear, Ctrl+A select all)
- [ ] Task 1.4 — Unit tests: Selection logic (85% coverage)

### Phase 2: Container Node Component
- [ ] Task 2.1 — Create `src/features/nodeEditor/nodes/ContainerNode.tsx`
  - [ ] Header with inline editable label
  - [ ] Collapse/expand chevron button
  - [ ] Container body (renders children when expanded)
  - [ ] Border styling (zinc/emerald per selection)
- [ ] Task 2.2 — Create container expand/collapse animations
  - [ ] Create `containerAnimations.css` with transition definitions
  - [ ] CSS transitions for size changes (200ms cubic-bezier)
  - [ ] Children fade in/out (150ms opacity transition)
  - [ ] Chevron rotation animation (200ms)
  - [ ] Add `prefers-reduced-motion` media query support
- [ ] Task 2.3 — Implement container port rendering for collapsed state
  - [ ] Calculate port positions on container edges
  - [ ] Render handle indicators for external connections
  - [ ] Port color-coding by type (from 4-6)
- [ ] Task 2.4 — Add container context menu
  - [ ] "Rename" option
  - [ ] "Ungroup" option
  - [ ] "Delete" option
- [ ] Task 2.5 — Unit tests: ContainerNode component (80% coverage)

### Phase 3: Group/Ungroup Operations
- [ ] Task 3.1 — Create `src/features/nodeEditor/utils/groupNodes.ts`
  - [ ] Validate: selected nodes are not already in a container (no nesting)
  - [ ] Calculate bounding box of selected nodes
  - [ ] Create container node with children
  - [ ] Convert child positions to relative coordinates
  - [ ] Set `parentNode` and `extent: 'parent'` on children
- [ ] Task 3.2 — Create `src/features/nodeEditor/utils/ungroupNodes.ts`
  - [ ] Convert child positions back to absolute
  - [ ] Restore internal connections
  - [ ] Remove container node
- [ ] Task 3.3 — Add group/ungroup actions to useNodeStore
  - [ ] `groupNodes()` action
  - [ ] `ungroupNodes()` action
  - [ ] Integration with debounced save (story 4.3 pattern)
- [ ] Task 3.4 — Implement group triggers
  - [ ] `Ctrl+G` keyboard shortcut
  - [ ] Context menu "Group" option (multi-select only)
  - [ ] Toolbar group button
- [ ] Task 3.5 — Implement ungroup triggers
  - [ ] `Ctrl+Shift+G` keyboard shortcut
  - [ ] Context menu "Ungroup" option
  - [ ] Delete container confirmation dialog
- [ ] Task 3.6 — Unit tests: Group/ungroup logic (85% coverage)

### Phase 4: Connection Management
- [ ] Task 4.1 — Create `src/features/nodeEditor/utils/connectionUtils.ts`
  - [ ] `isInternalConnection()` - both ends in container
  - [ ] `isExternalConnection()` - one end in, one out
  - [ ] `getContainerPorts()` - calculate port positions
  - [ ] `getInternalConnections()` - derive from edges array dynamically
  - [ ] `calculateContainerPortPosition()` - map internal handle to container edge
- [ ] Task 4.2 — Update edge rendering for containers
  - [ ] Hide internal edges when container collapsed
  - [ ] Render edges to container ports when collapsed
  - [ ] Normal edge rendering when expanded
- [ ] Task 4.3 — Handle connection creation with collapsed containers
  - [ ] Clicking container port initiates edge drag
  - [ ] Connects to actual internal node handle on completion
- [ ] Task 4.4 — Unit tests: Connection utilities (80% coverage)

### Phase 5: Drag & Drop Integration
- [ ] Task 5.1 — Implement container drag behavior
  - [ ] Container moves children with it (parentNode behavior via `parentNode`)
  - [ ] Prevent dragging container into another container (nesting validation)
  - [ ] Show visual "no nesting" feedback (red border) on invalid drop target
- [ ] Task 5.2 — Handle child node drag constraints
  - [ ] Children can be repositioned within container bounds
  - [ ] Visual bounds indicator when dragging near edge (zinc-400 dashed line)
  - [ ] Enforce `extent: 'parent'` constraint (React Flow native)
- [ ] Task 5.3 — Update React Flow `onNodeDragStop` handler
  - [ ] Handle container moves (trigger debounced save)
  - [ ] Handle child repositioning within container

### Phase 6: Persistence Integration
- [ ] Task 6.1 — Update PouchDB document types
  - [ ] Add `container` to node type enum
  - [ ] Add `parentNode` field to node documents
  - [ ] Add container data fields (type discriminator, createdAt)
- [ ] Task 6.2 — Update save/load logic
  - [ ] Save container nodes with child references
  - [ ] Load containers and restore parent-child relationships
  - [ ] Run container integrity validation on load
- [ ] Task 6.3 — Handle edge cases
  - [ ] Orphaned children (parentNode references deleted container)
  - [ ] Missing children (child IDs in container but not in DB)
  - [ ] Circular parent references (prevent in validation)
- [ ] Task 6.4 — Create `validateContainerIntegrity.ts`
  - [ ] Check for orphaned children
  - [ ] Validate all childNodeIds exist
  - [ ] Prevent circular parent references
  - [ ] Auto-repair minor inconsistencies (clear invalid parentNode refs)

### Phase 7: Toolbar & UI Integration
- [ ] Task 7.1 — Create `NodeToolbar.tsx` component
  - [ ] Group button (visible when multi-selection active, >1 node)
  - [ ] Ungroup button (visible when container selected)
  - [ ] Selection count badge
  - [ ] Button positioning (follows selection or fixed position)
- [ ] Task 7.2 — Update NodeCanvas.tsx
  - [ ] Register container node type
  - [ ] Integrate selection hooks (sync from React Flow)
  - [ ] Enable React Flow native `selectionOnDrag`
  - [ ] Add keyboard shortcut handlers (Ctrl+G, Ctrl+Shift+G, Ctrl+A, Escape)
  - [ ] Import and apply `containerAnimations.css`
- [ ] Task 7.3 — Add selection state indicators
  - [ ] "{N} nodes selected" badge (bottom-left of canvas)
  - [ ] First-time user hint: "Press Ctrl+G to group" (dismissible)
  - [ ] Contextual toolbar positioning

### Phase 8: Testing
- [ ] Task 8.1 — Unit tests: Selection system (85% coverage)
  - [ ] Shift+click selection
  - [ ] React Flow native selectionOnDrag
  - [ ] Keyboard shortcuts (Ctrl+A, Escape)
  - [ ] Selection persistence during node operations
  - [ ] Race condition: rapid selection changes
- [ ] Task 8.2 — Unit tests: Container operations (85% coverage)
  - [ ] Group creation with validation
  - [ ] Nesting prevention logic
  - [ ] Expand/collapse state management
  - [ ] Ungroup position restoration
  - [ ] Coordinate precision (floating-point math)
- [ ] Task 8.3 — Integration tests: Connection management (80% coverage)
  - [ ] Internal connection detection
  - [ ] External port position calculation
  - [ ] Edge creation with collapsed container
  - [ ] Connection restoration after ungroup
- [ ] Task 8.4 — E2E tests: Complete grouping workflow
  - [ ] Select 3+ nodes → Group → Verify container created
  - [ ] Collapse → Verify children hidden
  - [ ] Expand → Verify children visible
  - [ ] Ungroup → Verify nodes restored
  - [ ] Connect to node inside collapsed container
  - [ ] Multi-container workflow with cross-container edges
- [ ] Task 8.5 — E2E tests: Persistence
  - [ ] Save workflow with container
  - [ ] Reload → Verify container state preserved
  - [ ] Verify child positions restored
  - [ ] Orphaned child handling
  - [ ] Corrupted container data recovery
- [ ] Task 8.6 — Performance tests
  - [ ] Group 20 nodes <100ms
  - [ ] Group 50 nodes <200ms
  - [ ] Group 200 nodes <500ms
  - [ ] Expand/collapse with 50+ internal edges at 60fps
  - [ ] Canvas pan with 10+ expanded containers at 60fps
- [ ] Task 8.7 — Visual regression tests
  - [ ] Collapsed container snapshot
  - [ ] Expanded container with children
  - [ ] Multi-selection badge position
  - [ ] Container port rendering (collapsed state)
  - [ ] Selection ring (emerald-500)
- [ ] Task 8.8 — Accessibility tests
  - [ ] Keyboard navigation (Tab, Space, Escape, Ctrl+G)
  - [ ] ARIA attributes (aria-expanded, aria-label)
  - [ ] Screen reader announcements
  - [ ] Focus management (group/ungroup/expand/collapse)
  - [ ] `prefers-reduced-motion` support

## Dev Notes

### Architecture Context

Story 4.9 is the **ninth story in Epic 4 (Node Forge)** and introduces workspace organization through sub-graph containers. It builds on:
- Story 4-2: React Flow canvas foundation
- Story 4-3: Node store and persistence patterns
- Story 4-5 through 4-8: Node types and edge handling

**Key architectural decisions from PRD:**
- **FR25**: Sub-Graph Container functionality
- **FR30**: Node interaction (drag, pan, zoom)
- **NFR2**: 60fps canvas performance requirement
- **UX Spec**: Emerald/zinc color system, animation timing

**From Architecture Document:**
- **Component Location**: `src/features/nodeEditor/nodes/ContainerNode.tsx`
- **State Management**: Zustand for persistence, local state for selection
- **Styling**: Tailwind CSS with zinc/emerald design tokens
- **Parent-Child Pattern**: React Flow's built-in `parentNode` system

### Critical Implementation Details

#### React Flow Parent-Child Relationships

React Flow v12 supports nested nodes via the `parentNode` property:

```typescript
// Parent container node
const containerNode: Node = {
  id: 'container_1',
  type: 'container',
  position: { x: 100, y: 100 },
  style: { width: 400, height: 300 },
  data: { label: 'My Group', isCollapsed: false, childNodeIds: ['node_1', 'node_2'] },
};

// Child nodes reference parent
const childNode: Node = {
  id: 'node_1',
  type: 'correlation',
  position: { x: 20, y: 60 },  // Relative to parent origin
  parentNode: 'container_1',   // References container
  extent: 'parent',            // Constrain to parent bounds
  data: { /* ... */ },
};
```

**Key React Flow Props:**
```typescript
<ReactFlow
  nodeTypes={{
    container: ContainerNode,
    correlation: CorrelationNode,
    arithmetic: ArithmeticNode,
    ledgerSource: LedgerSourceNode,
  }}
  onSelectionChange={handleSelectionChange}
  selectionOnDrag={true}  // Enable drag-to-select
  selectionMode={SelectionMode.Full}  // Or Partial
  // ... other props
/>
```

#### Selection State Strategy

**IMPORTANT**: Use React Flow's native selection as the source of truth, sync to local state:

```typescript
// useNodeSelection.ts - Sync from React Flow's onSelectionChange
export const useNodeSelection = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Sync FROM React Flow - not parallel to it
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedIds(nodes.map(n => n.id));
  }, []);
  
  const selectAll = useCallback((nodes: Node[]) => {
    setSelectedIds(nodes.map(n => n.id));
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);
  
  return { selectedIds, onSelectionChange, selectAll, clearSelection };
};

// In NodeCanvas.tsx
<ReactFlow
  onSelectionChange={onSelectionChange}
  selectionOnDrag={true}
  selectionMode={SelectionMode.Full}
  // ...
/>
```

**Why this approach?**
- React Flow v12 has built-in selection management
- Avoid dual-source-of-truth issues
- Native `selectionOnDrag` provides lasso selection
- CSS styling handles visual feedback

#### Lasso Selection (React Flow Native)

Use React Flow's built-in `selectionOnDrag` instead of custom implementation:

```typescript
// NodeCanvas.tsx
import { SelectionMode } from '@xyflow/react';

<ReactFlow
  selectionOnDrag={true}
  selectionMode={SelectionMode.Full}
  // ...
/>
```

```css
/* containerAnimations.css - Selection box styling */
.react-flow__selection {
  border: 2px dashed #a1a1aa;  /* zinc-400 */
  background: rgba(39, 39, 42, 0.3);  /* zinc-800/30 */
}

/* Minimum size to prevent accidental triggers */
.react-flow__selection {
  min-width: 40px;
  min-height: 40px;
}
```

#### Group Creation Algorithm

```typescript
// groupNodes.ts
export const createContainerFromSelection = (
  selectedNodes: Node[],
  existingNodes: Node[],
  label?: string
): { container: Node; updatedChildren: Node[] } => {
  // 1. Validate: Prevent nesting
  const invalidNodes = selectedNodes.filter(
    n => n.parentNode !== undefined
  );
  if (invalidNodes.length > 0) {
    throw new Error('Cannot group nodes already in a container');
  }
  
  // 2. Calculate bounding box with padding
  const bounds = calculateBoundingBox(selectedNodes);
  const padding = 40;
  
  // 3. Create container node
  const containerId = `container_${nanoid(6)}`;
  const container: Node = {
    id: containerId,
    type: 'container',
    position: { x: bounds.minX - padding, y: bounds.minY - padding },
    style: {
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
    },
    data: {
      type: 'container',
      label: label || getDefaultContainerLabel(existingNodes),
      isCollapsed: false,
      childNodeIds: selectedNodes.map(n => n.id),
      createdAt: new Date().toISOString(),
    },
  };
  
  // 4. Convert children to relative positions
  const updatedChildren = selectedNodes.map(node => ({
    ...node,
    position: {
      x: node.position.x - container.position.x,
      y: node.position.y - container.position.y,
    },
    parentNode: containerId,
    extent: 'parent',  // React Flow native constraint
  }));
  
  return { container, updatedChildren };
};

const calculateBoundingBox = (nodes: Node[]) => {
  const xs = nodes.map(n => n.position.x);
  const ys = nodes.map(n => n.position.y);
  const widths = nodes.map(n => n.width || 150);
  const heights = nodes.map(n => n.height || 100);
  
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs.map((x, i) => x + widths[i])),
    maxY: Math.max(...ys.map((y, i) => y + heights[i])),
    width: Math.max(...xs.map((x, i) => x + widths[i])) - Math.min(...xs),
    height: Math.max(...ys.map((y, i) => y + heights[i])) - Math.min(...ys),
  };
};

// Note: Internal connections are calculated dynamically, not stored
export const getInternalConnections = (
  containerId: string,
  edges: Edge[],
  nodes: Node[]
): Edge[] => {
  const container = nodes.find(n => n.id === containerId);
  if (!container?.data?.childNodeIds) return [];
  
  const childIds = new Set(container.data.childNodeIds);
  return edges.filter(
    edge => childIds.has(edge.source) && childIds.has(edge.target)
  );
};
```

### Previous Story Learnings (from 4.1-4.8)

**Critical patterns to follow:**

1. **useShallow Import**: Import `useShallow` from `zustand/react`:
   ```typescript
   import { useShallow } from 'zustand/react';
   ```

2. **Performance**: Never update Zustand during drag operations
   - Selection uses local state
   - Node positions use React Flow internal state during drag
   - Only save on `onNodeDragStop`

3. **Node ID Generation**: Use nanoid pattern from 4-6
   ```typescript
   import { nanoid } from 'nanoid';
   const id = `container_${nanoid(6)}`;
   ```

4. **Debounced Persistence**: Same 1-second debounce pattern as story 4.3
   ```typescript
   // After group/ungroup, trigger:
   get().debouncedSaveCanvas();
   ```

5. **Error Handling**: Dispatch to global error store
   ```typescript
   useErrorStore.getState().dispatchError('Failed to group nodes');
   ```

6. **Styling**: Use zinc/emerald tokens from UX spec
   - Container border: `border-zinc-700` (default), `border-emerald-500` (selected)
   - Background: `bg-zinc-800`, `bg-zinc-900/50`

7. **Animation Timing**: Per UX spec
   - Quick feedback: 150ms
   - Standard transition: 200ms
   - Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

#### Container Validation & Integrity

```typescript
// validateContainerIntegrity.ts
export const validateContainerIntegrity = (
  nodes: Node[],
  edges: Edge[]
): { valid: boolean; errors: string[]; repaired: Node[] } => {
  const errors: string[] = [];
  const repaired = [...nodes];
  
  // 1. Check for orphaned children
  nodes.forEach((node, index) => {
    if (node.parentNode) {
      const parent = nodes.find(n => n.id === node.parentNode);
      if (!parent) {
        errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentNode}`);
        // Auto-repair: clear parentNode
        repaired[index] = { ...node, parentNode: undefined };
      }
    }
  });
  
  // 2. Validate container child references
  nodes.forEach((node, index) => {
    if (node.type === 'container' && node.data?.childNodeIds) {
      const missingChildren = node.data.childNodeIds.filter(
        childId => !nodes.find(n => n.id === childId)
      );
      if (missingChildren.length > 0) {
        errors.push(`Container ${node.id} references missing children: ${missingChildren.join(', ')}`);
        // Auto-repair: remove missing child IDs
        repaired[index] = {
          ...node,
          data: {
            ...node.data,
            childNodeIds: node.data.childNodeIds.filter(
              id => !missingChildren.includes(id)
            ),
          },
        };
      }
    }
  });
  
  // 3. Prevent circular references
  const hasCircularRef = (nodeId: string, visited = new Set<string>()): boolean => {
    if (visited.has(nodeId)) return true;
    visited.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node?.parentNode) {
      return hasCircularRef(node.parentNode, visited);
    }
    return false;
  };
  
  nodes.forEach(node => {
    if (node.parentNode && hasCircularRef(node.id)) {
      errors.push(`Circular reference detected: ${node.id}`);
    }
  });
  
  return { valid: errors.length === 0, errors, repaired };
};
```

#### CSS Animation Definitions

```css
/* containerAnimations.css */

/* Container expand/collapse transitions */
.container-node {
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1),
              height 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.container-node.collapsed {
  width: 160px;
  height: 40px;
}

/* Children fade animation */
.container-children {
  transition: opacity 150ms ease-out;
}

.container-children.hidden {
  opacity: 0;
  pointer-events: none;
}

/* Chevron rotation */
.chevron-icon {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.chevron-icon.collapsed {
  transform: rotate(-90deg);
}

/* Selection ring (emerald-500 per UX spec) */
.node-selected {
  box-shadow: 0 0 0 2px #10b981;  /* emerald-500 */
}

/* Focus ring for accessibility */
.container-header:focus-visible {
  outline: 2px solid #10b981;  /* emerald-500 */
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .container-node,
  .container-children,
  .chevron-icon {
    transition: none;
  }
}

/* React Flow selection box styling */
.react-flow__selection {
  border: 2px dashed #a1a1aa;  /* zinc-400 */
  background: rgba(39, 39, 42, 0.3);  /* zinc-800/30 */
  min-width: 40px;
  min-height: 40px;
}

/* No nesting visual feedback */
.container-drag-invalid {
  border-color: #ef4444 !important;  /* red-500 */
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
}

/* Container port indicators (collapsed state) */
.container-port {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  border: 2px solid #18181b;  /* zinc-900 */
}
```

### File Structure

```
src/
├── features/nodeEditor/
│   ├── nodes/
│   │   ├── ContainerNode.tsx           # NEW: Container node component
│   │   ├── CorrelationNode.tsx         # From 4-6 (update selection styling)
│   │   ├── ArithmeticNode.tsx          # From 4-6 (update selection styling)
│   │   └── LedgerSourceNode.tsx        # From 4-5 (update selection styling)
│   ├── components/
│   │   ├── NodeCanvas.tsx              # UPDATE: Add selectionOnDrag, keyboard handlers
│   │   ├── NodeToolbar.tsx             # NEW: Group/ungroup toolbar
│   │   └── SelectionBadge.tsx          # NEW: "{N} selected" indicator
│   ├── hooks/
│   │   ├── useNodeSelection.ts         # NEW: Selection state management (sync from RF)
│   │   └── useContainerState.ts        # NEW: Container expand/collapse
│   ├── utils/
│   │   ├── groupNodes.ts               # NEW: Group creation logic (with validation)
│   │   ├── ungroupNodes.ts             # NEW: Ungroup logic
│   │   └── connectionUtils.ts          # NEW: Internal/external connection detection
│   └── stores/
│       └── useNodeStore.ts             # UPDATE: Add container actions
├── styles/
│   └── containerAnimations.css         # NEW: Expand/collapse animations + selection box
└── tests/
    └── features/nodeEditor/
        ├── useNodeSelection.test.ts     # NEW: Selection tests
        ├── groupNodes.test.ts          # NEW: Group logic tests
        ├── connectionUtils.test.ts     # NEW: Connection utility tests
        ├── ContainerNode.test.tsx       # NEW: Container component tests
        └── grouping.e2e.test.ts         # NEW: E2E grouping flow tests
```

**Note:** No `LassoSelection.tsx` or `selectionBox.ts` — use React Flow native `selectionOnDrag` instead.

### Dependencies

- `@xyflow/react` v12 — Parent/child node support, selection API
- `nanoid` — Container ID generation (already in project)
- `lucide-react` — Icons (ChevronDown, ChevronRight, Group, Ungroup)
- **No new dependencies** — All functionality achievable with existing stack

### Out of Scope (Covered in Other Stories)

- **Nested Containers**: Containers cannot contain other containers — this is enforced by validation, not just out of scope
- **Container Resize**: Fixed size based on children (resize handles = future enhancement)
- **Container Templates**: Save/load container as reusable template (future story)
- **Advanced Layout**: Auto-layout algorithms for child nodes (future story)
- **Minimap Integration**: Container representation in minimap (story 4.4 baseline)
- **Undo/Redo**: Assumes existing undo/redo infrastructure (if available) — group/ungroup should be recorded as atomic operations

### Performance Considerations

| Scenario | Target | Strategy |
|----------|--------|----------|
| Expand/collapse | 60fps | CSS transforms only, no layout recalculation |
| Lasso selection | <16ms | React Flow native selectionOnDrag |
| Group 20 nodes | <100ms | Batch DOM updates |
| Group 50 nodes | <200ms | Batch DOM updates |
| Group 200 nodes | <500ms | Batch DOM updates |
| Container drag | 60fps | React Flow parentNode built-in optimization |
| Canvas pan with containers | 60fps | GPU-accelerated transforms |

**Performance Guardrails:**
- Use CSS transforms (not left/top) for all animations
- Memoize port position calculations
- Use `display: none` (not conditional render) for collapsed children
- React Flow's internal nodeMap optimization for 100+ nodes

### Testing Requirements

| Test Scenario | Expected Behavior |
|--------------|-------------------|
| Shift+click 3 nodes | All 3 selected, "3 selected" badge shows |
| React Flow selectionOnDrag 5 nodes | All 5 selected, box disappears on release |
| Ctrl+G with selection | Container created, children reparented |
| Group node already in container | Toast error: "Cannot group: node already in a container" |
| Click collapse chevron | Children fade out, container shrinks |
| External edge to collapsed container | Edge attaches to container port |
| Connect TO node inside collapsed container | Edge routes to container port, connects to internal handle |
| Drag container | All children move with it |
| Ungroup container | Children restored to absolute positions |
| Save/load with container | Container state preserved |
| Orphaned child on load | Child restored to absolute position, parentNode cleared |
| Rapid expand/collapse | No animation queue buildup, 60fps maintained |
| prefers-reduced-motion | Animations disabled, immediate state change |
| Keyboard-only workflow | Tab, Space, Escape, Ctrl+G all functional |
| Multi-container with cross-edges | Edges render correctly between containers |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-4] — Epic 4 definition, story 4.9
- [Source: _bmad-output/planning-artifacts/prd.md#FR25] — Sub-Graph Container requirement
- [Source: _bmad-output/planning-artifacts/prd.md#FR30] — Node interaction requirements
- [Source: _bmad-output/planning-artifacts/architecture.md] — Architecture decisions, project structure
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Design tokens, animations
- [Source: _bmad-output/implementation-artifacts/4-6-correlation-node-math-component.md] — Node component patterns
- [Source: _bmad-output/implementation-artifacts/4-7-complex-edge-connection-snapping.md] — Edge handling patterns
- React Flow Docs: https://reactflow.dev/learn/layout/sub-flows
- React Flow Docs: https://reactflow.dev/api-reference/types/node

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
