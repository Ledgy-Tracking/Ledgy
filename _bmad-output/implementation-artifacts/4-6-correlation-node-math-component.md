# Story 4.6: Correlation Node (Math) Component

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Prerequisites

- **Story 4-5 (Ledger Source Node Component)** - MUST be completed first. This story assumes Ledger Source Node exists and focuses on operation nodes (Correlation, Arithmetic) only.
- **Story 4-1 (Workflow Script List & Management)** - Node palette integration depends on workflow management from 4-1.
- **Stories 4-2 through 4-4** - React Flow canvas, node store, and viewport controls must be functional.
- **useNodeStore Requirements** - Must have `updateNodeData()` action. If not present from story 4.3, implement in Task 7.2 of this story.

## Story

As a Node Forge user,
I want to add correlation and arithmetic nodes to my workflow,
so that I can perform mathematical operations and statistical correlations between ledger data sources.

## Definition of Done

- [ ] All 7 acceptance criteria implemented and verified
- [ ] Correlation Node component implements Pearson's coefficient calculation
- [ ] Arithmetic Node component supports Add, Subtract, Multiply, Divide operations
- [ ] All nodes follow React Flow custom node patterns with proper TypeScript types
- [ ] Node outputs display live preview values when connected to data
- [ ] Visual design matches UX specification (Emerald accent, Zinc dark theme)
- [ ] No regressions in existing NodeCanvas functionality (stories 4.1-4.4 baseline)
- [ ] Code review completed and approved by Tech Lead
- [ ] Unit test coverage: CorrelationNode 85%, ArithmeticNode 85% (including dynamic port tests)
- [ ] E2E tests pass for node creation, connection, and computation flows
- [ ] Zero TypeScript compilation errors (strict mode)
- [ ] Zero ESLint warnings (max-warnings 0)

## Acceptance Criteria

### AC1: Correlation Node Component
**Given** the user has added a Correlation node  
**When** they configure and execute it  
**Then** the node:

**Visual Appearance:**
- Header: "Correlation" with `GitBranch` icon (rotated 90°, emerald-500)
- Input ports: Two (Input A, Input B) - both accept Number arrays
- Output port: Single "r-value" (correlation coefficient, -1 to 1)
- Live preview: Displays "r = {value}" when computed (updates every 2s max)
- Background: zinc-800 with subtle emerald tint when active

**Configuration Panel:**
- Correlation type selector: `Pearson` (default) | `Spearman` (future)
- Sample size display: "N = {count}" (entries used in calculation)
- Last computed: timestamp

**Computation Requirements:**
- Pearson's r formula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
- Handle edge cases:
  - Empty arrays: Output `null` with "Insufficient data" tooltip
  - Single value: Output `null` with "Need 2+ data points"
  - Zero variance: Output `null` with "No variance in data"
- Performance: Compute in <100ms for 10,000 data points (Web Worker story 4.11)

**Data Contract:**
```typescript
inputs: {
  inputA: number[];  // Required - arrays for correlation calculation
  inputB: number[];  // Required - arrays for correlation calculation
}
output: {
  correlation: number | null;  // -1 to 1, or null if error
  sampleSize: number;
  confidence?: number;  // Future: statistical confidence
}
```

**Port Type Note:** Input ports accept `number[]` (arrays) for batch correlation. Port color coding uses **cyan** (array type) per AC3 type system.

**Performance Note:** Target <500ms for 1,000 data points on main thread. Full <100ms performance for 10,000 points requires Web Worker offload (story 4.11).

### AC2: Arithmetic Node Component
**Given** the user has added an Arithmetic node  
**When** they configure it  
**Then** the node supports:

**Operations:**
| Operation | Symbol | Inputs | Output |
|-----------|--------|--------|--------|
| Add | + | 2+ numbers | Sum |
| Subtract | − | 2 numbers | Difference |
| Multiply | × | 2+ numbers | Product |
| Divide | ÷ | 2 numbers | Quotient |

**Visual Appearance:**
- Header: Operation name with `Calculator` icon (amber-500)
- Input ports: Dynamic (2 minimum, up to 5)
  - "+" button to add input port (max 5)
  - "−" button to remove input port (min 2)
- Output port: Single "Result" (number)
- Live preview: Shows "= {value}" with 2 decimal precision
- Background: zinc-800 with amber tint when configured

**Configuration Panel:**
- Operation dropdown (Add | Subtract | Multiply | Divide)
- Input count: "{N} inputs" (read-only, controlled via node UI)
- Precision: Decimal places (0-4, default 2)

**Edge Cases:**
- Division by zero: Output `null` with "Division by zero" tooltip
- Missing inputs: Output `null` with "{N} inputs required" tooltip
- Non-numeric inputs: Blocked at connection time by story 4-8 edge validation

### AC3: Port Type System (Basic)

> **Note:** Full edge type validation (blocking invalid connections, visual feedback) is implemented in story 4-8. This AC defines port typing for 4-6 nodes only.

**Given** a node is configured  
**When** ports are rendered  
**Then** each port has a defined type:

**Correlation Node Ports:**
| Port | Type | Direction | Color |
|------|------|-----------|-------|
| Input A | `number[]` (array) | Input | Cyan |
| Input B | `number[]` (array) | Input | Cyan |
| r-value | `number` (scalar) | Output | Emerald |

**Arithmetic Node Ports:**
| Port | Type | Direction | Color |
|------|------|-----------|-------|
| Input 1-N | `number` (scalar) | Input (dynamic, 2-5) | Emerald |
| Result | `number` (scalar) | Output | Emerald |

**Dynamic Port Handling (Arithmetic):**
- Port IDs: `input-1`, `input-2`, `input-3`, `input-4`, `input-5`
- Only ports 1-N are created based on current `inputCount`
- Metadata updated dynamically when input added/removed
- Max 5 inputs, min 2 inputs

**Type Metadata Storage:**
```typescript
// Store port types in node data for 4-8 validation to consume
interface NodePortMetadata {
  portId: string;
  type: PortType;
  direction: 'input' | 'output';
  accepts?: PortType[]; // For input ports
}

// Port color mapping
const portColorMap: Record<PortType, string> = {
  number: '#10b981',    // emerald-500
  'number[]': '#06b6d4', // cyan-500 (arrays)
  text: '#3b82f6',      // blue-500
  date: '#f59e0b',      // amber-500
  boolean: '#a855f7',   // purple-500
  array: '#06b6d4',     // cyan-500
  any: '#a1a1aa',       // zinc-400
};
```

### AC4: Node Type Registration
**Given** the Node Forge canvas is loaded  
**When** the node palette is rendered (from story 4-1)  
**Then** Correlation and Arithmetic nodes appear in the palette:

**Palette Registration:**
- Category: "Operations"
- Nodes displayed:
  - ➕ Arithmetic - "Add, subtract, multiply, divide"
  - 📈 Correlation - "Statistical correlation (Pearson)"

**Node Creation Behavior:**
- Click/drag from palette → create instance on canvas
- Default position: Center of current viewport
- Default ID: `{type}_{nanoid(6)}`
- Default label: Auto-increment (e.g., "Correlation 1", "Arithmetic 2")

**Auto-Increment Label Behavior:**
- Counter resets per workflow (when switching workflows, labels restart at 1)
- Counter persists within a workflow session
- Deleted node numbers are NOT reused (gap in sequence is OK)
- Example: Create Correlation (→"Correlation 1"), Create Correlation (→"Correlation 2"), Delete "Correlation 1", Create Correlation (→"Correlation 3")

> **Note:** Palette UI (drag-drop, N-key toggle, navigation) is implemented in story 4-1. This AC verifies operation nodes are properly registered in the palette system.

### AC5: Live Data Preview on Connections

> **Note:** Real-time ledger data integration requires story 4-10 (Graph PouchDB Hydration Hooks). For 4-6, use mock/test data to verify UI preview functionality.

**Given** a node has valid inputs connected  
**When** test data is provided  
**Then** the node displays live preview:

**Preview Display Rules:**
- Correlation: Shows "r = {value}" (or error state)
- Arithmetic: Shows "= {result}" (or error state)

**Mock Data Testing (for 4-6 implementation):**
Since real-time ledger data requires story 4-10, use mock data to verify UI:

| Node | Mock Input | Expected Output |
|------|------------|-----------------|
| Correlation | A=[1,2,3,4,5], B=[2,4,6,8,10] | r ≈ 1.0 (perfect correlation) |
| Correlation | A=[5,4,3,2,1], B=[1,2,3,4,5] | r ≈ -1.0 (perfect inverse) |
| Arithmetic | inputs=[10, 20], op=Add | = 30 |
| Arithmetic | inputs=[100, 25], op=Subtract | = 75 |
| Arithmetic | inputs=[5, 6, 7], op=Add | = 18 (3+ inputs) |
| Arithmetic | inputs=[100, 0], op=Divide | null (division by zero) |

**Mock Data Implementation:**
```typescript
// useMockNodeData.ts - for testing only
export const useMockNodeData = () => ({
  correlationTest: {
    inputA: [1, 2, 3, 4, 5],
    inputB: [2, 4, 6, 8, 10],
  },
  arithmeticTest: {
    inputs: [10, 20],
    operation: 'add',
  },
});
```

**Update Throttling:**
- Minimum interval: 500ms between preview updates
- Prevent flicker during rapid data changes
- Show "Computing..." spinner if calculation >100ms

**Computation Error Handling:**
- Runtime error (null reference, etc.): Show "Computation error" badge
- Timeout (>5s): Show "Calculation timed out" tooltip
- All errors caught, never crash the node

**Error Display Consistency:**
Error states are displayed uniformly across both node types:
- **Visual indicator:** Red badge with `AlertCircle` icon on node header (badge contains the icon)
- **Tooltip:** Error description on hover
- **Output port:** Grayed out, no data emitted
- **Screen reader:** Error announced via ARIA live region

### AC6: Node Persistence Integration
**Given** operation nodes are placed on the canvas  
**When** the debounced save triggers (story 4.3)  
**Then** node configuration persists to PouchDB:

**Save Triggers:**
- Node moved: `onNodeDragStop` (existing from 4.3)
- Node added/deleted: `onNodesChange` (existing from 4.3)
- Node configured: Configuration panel changes → call `updateNodeData()` → debounced save (story 4.3 pattern)

### AC7: Node Accessibility
**Given** nodes are on the canvas  
**When** using keyboard navigation  
**Then** the following keyboard controls work:

**Keyboard Navigation:**
| Key | Action |
|-----|--------|
| Tab | Focus next node (left-to-right, top-to-bottom) |
| Shift+Tab | Focus previous node |
| Enter | Open selected node configuration |
| Delete | Remove focused node (with confirmation) |
| Space | Toggle node selection (multi-select with Ctrl) |

**ARIA Attributes:**
- Each node: `role="group"`, `aria-label="{nodeType}: {label}"`
- Output ports: `role="button"`, `aria-label="Output: {fieldName}"`
- Input ports: `role="button"`, `aria-label="Input: {fieldName}, accepts {type}"`
- Configuration panel: `role="dialog"`, `aria-modal="true"`

**Screen Reader Announcements:**
- "Node added: Correlation 1"
- "Connected Arithmetic 1 output to Correlation 1 input A"
- "Configuration saved"
- "Error: Division by zero in Arithmetic 1"

## Type Definitions

> **Note:** Base types (`CanvasNode`, `CanvasEdge`, `Viewport`) are defined in story 4.3. This story extends them with operation-specific node data.

```typescript
// Port type system (shared across Epic 4)
type PortType = 'number' | 'text' | 'date' | 'boolean' | 'array' | 'any';

interface PortDefinition {
  id: string;
  name: string;
  type: PortType;
  required?: boolean;
  description?: string;
}

// Correlation Node Data
interface CorrelationNodeData {
  label: string;
  correlationType: 'pearson';
  lastResult?: {
    correlation: number | null;
    sampleSize: number;
    computedAt: string;
  };
}

// Arithmetic Node Data
interface ArithmeticNodeData {
  label: string;
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  precision: number;
  inputCount: number;
  lastResult?: {
    value: number | null;
    computedAt: string;
  };
}

// Extended NodeData union (adds to existing from 4-5)
interface OperationNodeData {
  label: string;
  correlationType?: 'pearson';
  operation?: 'add' | 'subtract' | 'multiply' | 'divide';
  precision?: number;
  inputCount?: number;
  lastResult?: {
    correlation?: number | null;
    value?: number | null;
    sampleSize?: number;
    computedAt: string;
  };
}

// Port metadata for 4-8 validation
interface NodePortMetadata {
  portId: string;
  type: PortType;
  direction: 'input' | 'output';
  accepts?: PortType[];
}

// Node computation result
interface ComputationResult {
  value: number | string | boolean | null;
  error?: string;
  computedAt: string;
}
```

## Tasks / Subtasks

### Phase 0: Prerequisites
- [ ] Task 0.1 — Verify React Flow version ≥12 and custom node support
- [ ] Task 0.2 — Verify useNodeStore has node CRUD actions (addNode, updateNode, deleteNode)
- [ ] Task 0.3 — Create `src/features/nodeEditor/nodes/` directory
- [ ] Task 0.4 — Define shared node styling constants (colors, sizes, borders)

### Phase 1: Node Type System Foundation
- [ ] Task 1.1 — Extend `src/types/nodes.ts` with PortType and operation node data interfaces
- [ ] Task 1.2 — Create `src/features/nodeEditor/utils/portColors.ts` with type→color mapping
- [ ] Task 1.3 — Create `src/features/nodeEditor/utils/portMetadata.ts` for 4-8 validation prep
- [ ] Task 1.4 — Add unit tests for port type definitions

### Phase 2: Correlation Node
- [ ] Task 2.1 — Create `CorrelationNode.tsx` component
- [ ] Task 2.2 — Implement Pearson correlation algorithm
- [ ] Task 2.3 — Add live preview display with throttled updates (500ms)
- [ ] Task 2.4 — Implement edge case handling (empty, single value, zero variance)
- [ ] Task 2.5 — Add configuration panel with correlation type selector
- [ ] Task 2.6 — Style with emerald accent tint when active
- [ ] Task 2.7 — Add unit tests including statistical accuracy (85% coverage)

### Phase 3: Arithmetic Node
- [ ] Task 3.1 — Create `ArithmeticNode.tsx` component
- [ ] Task 3.2 — Implement Add, Subtract, Multiply, Divide operations
- [ ] Task 3.3 — Add dynamic input port management (+/− buttons)
- [ ] Task 3.4 — Add live result preview with precision control
- [ ] Task 3.5 — Implement division by zero and missing input handling
- [ ] Task 3.6 — Add configuration panel with operation selector
- [ ] Task 3.7 — Style with amber accent tint when configured
- [ ] Task 3.8 — Add unit tests (85% coverage)

### Phase 4: Node Registration & Palette
> **Note:** Node palette UI structure from story 4-1. This phase registers new node types.

- [ ] Task 4.1 — Register Correlation and Arithmetic node types in NodeCanvas.tsx
- [ ] Task 4.2 — Add node types to palette configuration (integrates with 4-1)
- [ ] Task 4.3 — Implement auto-increment node labels ("Correlation 1", "Arithmetic 2")

### Phase 5: Port Type Integration (Prep for 4-8)
> **Note:** Full edge validation in story 4-8. This phase adds port type metadata.

- [ ] Task 5.1 — Store port type metadata in node data (for 4-8 to consume)
- [ ] Task 5.2 — Export port type getters for cross-node validation

### Phase 6: Live Preview System
- [ ] Task 6.1 — Create `src/features/nodeEditor/hooks/useNodeComputation.ts`
- [ ] Task 6.2 — Implement computation trigger on input changes
- [ ] Task 6.3 — Add throttling (500ms) to prevent flicker
- [ ] Task 6.4 — Add "Computing..." loading state for slow operations
- [ ] Task 6.5 — Display error states with red badges and tooltips

### Phase 7: Persistence Integration
- [ ] Task 7.1 — Extend CanvasDocument type with node-specific data fields
- [ ] Task 7.2 — Add `updateNodeData` action to useNodeStore (if not from 4.3)
  - **First:** Verify if `updateNodeData` exists in useNodeStore from story 4.3
  - **If missing:** Implement action that updates node data and triggers debounced save
  - **If exists:** Verify signature matches requirements, use existing action
- [ ] Task 7.3 — Wire configuration changes → debounced save
- [ ] Task 7.4 — Verify node configuration persists across reloads
- [ ] Task 7.5 — Test backward compatibility (nodes without config data)

### Phase 8: Accessibility Implementation
- [ ] Task 8.1 — Add ARIA labels to all node elements
- [ ] Task 8.2 — Implement keyboard navigation (Tab, Enter, Delete, Space)
- [ ] Task 8.3 — Add focus indicators (emerald-500 ring)
- [ ] Task 8.4 — Create ARIA live region for screen reader announcements
- [ ] Task 8.5 — Add E2E test for keyboard-only node creation and configuration

### Phase 9: Testing & Validation
- [ ] Task 9.1 — Unit tests: CorrelationNode including statistical accuracy (85% coverage)
- [ ] Task 9.2 — Unit tests: ArithmeticNode edge cases (85% coverage)
- [ ] Task 9.3 — Unit tests: ArithmeticNode dynamic port add/remove functionality
  - Test adding input port (2→3→4→5)
  - Test removing input port (5→4→3→2)
  - Test min/max limits (cannot go below 2, cannot exceed 5)
  - Test port ID consistency after add/remove operations
- [ ] Task 9.4 — Integration tests: Port type metadata consistency
- [ ] Task 9.5 — Integration tests: Node persistence (save/load)
- [ ] Task 9.6 — E2E tests: Complete workflow (add node → configure → connect → compute)
- [ ] Task 9.7 — Performance test: 100 operation nodes with previews

## Dev Notes

### Architecture Context

Story 4.6 is the **sixth story in Epic 4 (Node Forge)** and builds on stories 4.1-4.5. It implements the first operation node types (Correlation, Arithmetic) that enable data processing in the visual scripting engine.

**Scope Clarification:**
- This story implements **operation nodes only** (Correlation, Arithmetic)
- **Ledger Source Node** is implemented in story 4-5 (prerequisite)
- **Edge type validation** is fully implemented in story 4-8 (this story adds port type metadata only)

**Key architectural decisions from PRD:**
- **Node Editor**: React Flow (`@xyflow/react`) custom nodes
- **FR29**: Operator Nodes for arithmetic and correlation operations
- **FR24**: Edge type validation (metadata prep in 4-6, full validation in 4-8)
- **NFR2**: 60fps canvas performance with 100+ nodes

**From Architecture Document:**
- **Component Location**: `src/features/nodeEditor/nodes/`
- **Store Pattern**: Extend `useNodeStore.ts` with node data management
- **Styling**: Tailwind CSS with zinc/emerald/amber design tokens from UX spec
- **Icons**: lucide-react (already in project dependencies)

### Critical Implementation Details

#### Custom Node Pattern (React Flow v12)

```typescript
// CorrelationNode.tsx - Custom node component pattern
import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface CorrelationNodeData {
  label: string;
  correlationType: 'pearson';
  lastResult?: {
    correlation: number | null;
    sampleSize: number;
  };
}

const CorrelationNode = memo(({ data, selected }: NodeProps<CorrelationNodeData>) => {
  const displayValue = useMemo(() => {
    if (data.lastResult?.correlation == null) return '—';
    return `r = ${data.lastResult.correlation.toFixed(3)}`;
  }, [data.lastResult]);

  return (
    <div className={`
      rounded-lg border-2 bg-zinc-800 p-3 min-w-[160px]
      ${selected ? 'border-emerald-500' : 'border-zinc-700'}
      ${data.lastResult ? 'bg-emerald-900/10' : ''}
      transition-colors duration-150
    `}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-emerald-500 rotate-90" />
        <span className="text-sm font-medium text-zinc-100">{data.label}</span>
      </div>
      
      {/* Live Preview */}
      <div className="text-xs text-emerald-400 font-mono mb-3">
        {displayValue}
      </div>
      
      {/* Input handles - cyan for number[] array type */}
      <Handle
        type="target"
        position={Position.Left}
        id="inputA"
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-zinc-800"
        style={{ top: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="inputB"
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-zinc-800"
        style={{ top: '60%' }}
      />
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-800"
      />
    </div>
  );
});

export default CorrelationNode;
```

#### Node Registration Pattern

```typescript
// In NodeCanvas.tsx - extend existing nodeTypes from 4-5
import CorrelationNode from './nodes/CorrelationNode';
import ArithmeticNode from './nodes/ArithmeticNode';

const nodeTypes = {
  ledgerSource: LedgerSourceNode,  // From story 4-5
  correlation: CorrelationNode,     // NEW in 4-6
  arithmetic: ArithmeticNode,       // NEW in 4-6
};

// Usage in ReactFlow
<ReactFlow
  nodeTypes={nodeTypes}
  // ... other props
/>
```

#### Port Type Metadata (Prep for 4-8)

```typescript
// src/features/nodeEditor/utils/portMetadata.ts
import type { Connection } from '@xyflow/react';

// Store port types in node data for 4-8 validation to consume
export interface PortMetadata {
  portId: string;
  type: PortType;
  direction: 'input' | 'output';
  accepts?: PortType[];
}

// Helper to extract port type from any node
export const getPortType = (
  nodeId: string,
  handleId: string,
  nodes: CanvasNode[]
): PortType | null => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  
  // For operation nodes (4-6 scope)
  if (node.type === 'correlation') {
    const portMap: Record<string, PortType> = {
      inputA: 'number',
      inputB: 'number',
      output: 'number',
    };
    return portMap[handleId] || null;
  }
  
  if (node.type === 'arithmetic') {
    if (handleId === 'output') return 'number';
    if (handleId.startsWith('input')) return 'number';
  }
  
  // Ledger source handled in 4-5
  return null;
};

// Export for story 4-8 to import
export { getPortType };
```

#### Pearson Correlation Implementation

```typescript
// src/features/nodeEditor/utils/statistics.ts
export const calculatePearsonCorrelation = (
  x: number[],
  y: number[]
): { r: number | null; error?: string } => {
  // Validation
  if (x.length === 0 || y.length === 0) {
    return { r: null, error: 'Insufficient data' };
  }
  if (x.length !== y.length) {
    return { r: null, error: 'Array length mismatch' };
  }
  if (x.length < 2) {
    return { r: null, error: 'Need 2+ data points' };
  }
  
  // Calculate means
  const xMean = x.reduce((a, b) => a + b, 0) / x.length;
  const yMean = y.reduce((a, b) => a + b, 0) / y.length;
  
  // Calculate Pearson's r
  let numerator = 0;
  let xDenom = 0;
  let yDenom = 0;
  
  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenom += xDiff * xDiff;
    yDenom += yDiff * yDiff;
  }
  
  // Check for zero variance
  if (xDenom === 0 || yDenom === 0) {
    return { r: null, error: 'No variance in data' };
  }
  
  const r = numerator / Math.sqrt(xDenom * yDenom);
  return { r: Math.max(-1, Math.min(1, r)) }; // Clamp to [-1, 1]
};
```

#### Node Data Change Handler

```typescript
// In useNodeStore.ts - Extend with node data update
interface NodeStoreState {
  // ... existing state
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
}

updateNodeData: (nodeId, data) => {
  set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, ...data } }
        : node
    ),
  }));
  
  // Trigger debounced save
  get().debouncedSaveCanvas();
},
```

### Previous Story Learnings (from 4.1-4.4)

**Critical patterns to follow:**

1. **useShallow Import**: Import `useShallow` from `zustand/react` (NOT from @xyflow/react):
   ```typescript
   import { useShallow } from 'zustand/react';
   ```

2. **Store Pattern**: Extend `useNodeStore` with new actions. Keep node data centralized.

3. **Debounced Persistence**: Node data changes trigger same 1-second debounce as position changes (story 4.3 pattern).

4. **Error Handling**: Always dispatch to `useErrorStore`:
   ```typescript
   useErrorStore.getState().dispatchError('Failed to compute correlation');
   ```

5. **Component Location**: Create new node components in `src/features/nodeEditor/nodes/`

6. **Accessibility**: All interactive elements need:
   - `aria-label` for icon buttons
   - `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`
   - Keyboard navigation support

### Node Palette Integration (with 4-1)

> **Note:** NodePalette base component from story 4-1. This shows the configuration addition for 4-6 nodes.

```typescript
// NodePalette.tsx - Add to existing categories from 4-1
import { Calculator, GitBranch } from 'lucide-react';

// Extend existing nodeCategories from story 4-1
const operationNodes: NodeCategory = {
  name: 'Operations',
  nodes: [
    { 
      type: 'arithmetic', 
      label: 'Arithmetic', 
      icon: Calculator, 
      description: 'Add, subtract, multiply, divide' 
    },
    { 
      type: 'correlation', 
      label: 'Correlation', 
      icon: GitBranch, 
      description: 'Statistical correlation (Pearson)' 
    },
  ],
};

// Merge with existing categories from 4-1 and 4-5
const nodeCategories = [
  ...existingCategories,  // From 4-1/4-5
  operationNodes,         // NEW from 4-6
];
```

### Performance Guardrails

- **Memoization**: Wrap all node components with `React.memo()` to prevent unnecessary re-renders
- **Throttled previews**: 500ms minimum between preview updates
- **Lazy computation**: Only compute when inputs change, not on every render
- **No store subscriptions in nodes**: Use React Flow's internal state for positioning
- **Web Worker prep**: Structure correlation calculation to be easily moved to Web Worker (story 4.11)

### Error Scenarios to Handle

| Error | Cause | Behavior |
|-------|-------|----------|
| Type mismatch | Validation bypassed | Handled by story 4-8 |
| Division by zero | Arithmetic operation | Output null, show error tooltip |
| Circular reference | Self-referencing graph | Detected in story 4.12, prevent creation |
| Computation timeout | Very large dataset | Show timeout error, suggest filtering |
| Missing inputs | Not enough connections | Output null, show "{N} inputs required" |
| Statistical error | Zero variance, etc. | Output null, show specific error (AC1) |

### File Structure

```
src/
├── features/nodeEditor/
│   ├── nodes/
│   │   ├── CorrelationNode.tsx       # NEW: Statistical correlation
│   │   ├── ArithmeticNode.tsx        # NEW: Math operations
│   │   └── index.ts                  # MODIFIED: Export operation nodes
│   ├── components/
│   │   ├── NodeCanvas.tsx            # MODIFIED: Register operation nodeTypes
│   │   └── NodePalette.tsx           # MODIFIED: Add operation nodes (from 4-1)
│   ├── hooks/
│   │   └── useNodeComputation.ts     # NEW: Live preview computation
│   ├── utils/
│   │   ├── portColors.ts             # NEW: Type→color mapping
│   │   ├── portMetadata.ts           # NEW: Port type metadata for 4-8
│   │   └── statistics.ts             # NEW: Correlation math
│   └── types/
│       └── nodes.ts                  # MODIFIED: Add operation node types
├── stores/
│   └── useNodeStore.ts               # MODIFIED: Add updateNodeData action
└── types/
    └── nodeEditor.ts                 # MODIFIED: Extend node data types
```

**Dependencies on Other Stories:**
- `LedgerSourceNode.tsx` — Provided by story 4-5
- `NodePalette.tsx` base — Provided by story 4-1
- `connectionValidation.ts` full implementation — Provided by story 4-8

### Dependencies

- `@xyflow/react` v12 — Custom nodes, Handle components
- `lucide-react` — Icons (Database, Calculator, GitBranch)
- `zustand` — State management
- `nanoid` — Node ID generation (already in project)

### Out of Scope (Covered in Other Stories)

- **Ledger Source Node**: Story 4-5 (prerequisite - provides data source)
- **Strict Edge Type Validation**: Story 4-8 (this story provides port metadata only)
- **Node Palette UI**: Story 4-1 (base component) - this story adds node type registration
- **Trigger Nodes**: Story 4.13 (On-Create triggers)
- **Dashboard Output Nodes**: Story 4.14 (writing to dashboard)
- **Advanced Math**: Matrix operations, regression (future enhancement)
- **Real-time Data Streaming**: Live ledger updates (story 4.10)
- **Node Grouping**: Sub-graph containers (story 4.9)
- **Web Worker Computation**: Heavy math offload (story 4.11)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-4] — Epic 4 definition, story 4.6
- [Source: _bmad-output/planning-artifacts/prd.md#FR29] — Operator Nodes requirement
- [Source: _bmad-output/planning-artifacts/prd.md#FR24] — Edge type validation requirement
- [Source: _bmad-output/planning-artifacts/architecture.md] — Architecture decisions, project structure
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Design tokens, component styling
- [Source: _bmad-output/implementation-artifacts/4-4-minimap-zoom-to-fit-controls.md] — Previous story patterns
- React Flow Docs: https://reactflow.dev/learn/customization/custom-nodes

## Story Review & Fixes Applied

**Review Date:** 2026-04-12 (Round 1)  
**Reviewer:** Adversarial Code Review (3-layer analysis)  
**Quality Score:** 6.5/10 → 8.5/10 (after Round 1 fixes)

### Critical Issues Fixed (Round 1)

1. **Removed Ledger Source Node from scope** (C1)
   - Ledger Source is story 4-5, not 4-6
   - Added 4-5 as explicit prerequisite
   - Removed AC1 (was Ledger Source), renumbered remaining ACs
   - Removed LedgerSourceNode from DoD, File Structure, Tasks

2. **Clarified Edge Type Validation scope** (C2)
   - Full validation is story 4-8
   - 4-6 now adds port type metadata only (prep for 4-8)
   - Removed AC4 full validation matrix, replaced with AC3 (Port Type System)
   - Added note: "Edge validation handled in story 4-8"

3. **Updated AC count**
   - Was: 8 ACs including Ledger Source and full validation
   - Now: 6 ACs focused on Correlation, Arithmetic, Port Types, Palette, Preview, Persistence

4. **Fixed Type Definitions**
   - Removed duplicate CanvasNode/CanvasEdge (from 4.3)
   - Removed LedgerSourceNodeData (from 4-5)
   - Added note referencing base types from 4.3

5. **Renumbered all phases**
   - Removed Phase 2 (Ledger Source)
   - Phases now: 1, 2, 3, 4, 5, 6, 7, 8, 9 (was 10 phases)

6. **Updated DoD**
   - Removed LedgerSourceNode coverage target
   - Now: CorrelationNode 85%, ArithmeticNode 85%

---

**Review Date:** 2026-04-12 (Round 2)  
**Reviewer:** Adversarial Code Review (3-layer analysis)  
**Quality Score:** 8.5/10 → 9.2/10 (after Round 2 fixes)

### Critical Issues Fixed (Round 2)

1. **Split AC6 into AC6 + AC7** (C1)
   - AC6 was Persistence + Accessibility (two Given/When/Then blocks)
   - Now: AC6 = Persistence, AC7 = Accessibility
   - Updated DoD: "All 7 acceptance criteria" (was 6)

2. **Fixed task numbering gaps** (C2)
   - Tasks were 3.1, 3.2... 4.1, 4.2... (missing 2.x)
   - Now: Phase 2 = Task 2.1-2.7, Phase 3 = Task 3.1-3.8, etc.
   - All tasks sequentially numbered

3. **Fixed Correlation port type inconsistency** (C3)
   - Was: AC said `number[]` but Dev Notes showed blue (number) handles
   - Now: Cyan color for array type, added port color table
   - Added color mapping documentation

### High Priority Fixes (Round 2)

4. **Added mock data specification** (H2)
   - AC5 now includes specific mock test data
   - Added `useMockNodeData()` example implementation
   - Expected outputs documented for testing

5. **Added dynamic port handling** (H3)
   - AC3 now specifies port ID scheme: `input-1`, `input-2`, etc.
   - Max 5 inputs, min 2 inputs documented
   - Metadata update behavior specified

6. **Added computation error handling** (H4)
   - AC5 now specifies: runtime errors, timeout handling
   - "Never crash the node" requirement added

7. **Narrowed AC4 scope** (M3)
   - Was: Full palette behavior (drag, N-key, navigation)
   - Now: Node type registration only
   - References 4-1 for palette UI behavior

8. **Added updateNodeData prerequisite** (H1)
   - Added to Prerequisites: "useNodeStore must have updateNodeData()"
   - Task 7.2 now explicitly creates this action if missing

---

**Review Date:** 2026-04-12 (Round 3 - Party Mode Review)  
**Review Panel:** Amelia (Dev), Quinn (QA), Murat (Test Arch), Winston (Architect), Sally (UX)  
**Quality Score:** 9.0/10 (consensus)  
**Status:** ✅ **APPROVED FOR DEVELOPMENT**

### Party Mode Panel Recommendations Applied

1. **Error Display Consistency** (Amelia)
   - Clarified that red badge contains `AlertCircle` icon (unified display)
   - Added screen reader announcement via ARIA live region

2. **Dynamic Port Test Coverage** (Quinn)
   - Added Task 9.3: Explicit test for Arithmetic port add/remove
   - Tests min/max limits (2-5), port ID consistency, add/remove sequences

3. **Store Action Verification** (Murat)
   - Enhanced Task 7.2 with verification step before implementation
   - Prevents duplicate implementation if 4.3 already has action

4. **Label Persistence Documentation** (Sally)
   - Added detailed specification for auto-increment behavior
   - Clarifies: per-workflow scope, no number reuse, gap tolerance

### Panel Consensus
- **Implementation Readiness:** High
- **Story Clarity:** Excellent
- **Test Coverage:** Comprehensive
- **Architecture:** Sound

### References Added

- Prerequisites section with 4-5, 4-1, 4.2-4.4 dependencies
- Notes throughout referencing 4-8 for validation, 4-10 for live data
- File Structure now lists dependencies on other stories
- Port color mapping table
- Mock data specification table

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Code Review Round 2 (2026-04-12) - PATCHES APPLIED ✅

The following issues were identified and fixed during automated code review:

**Applied Fixes:**
- [x] [Review][Patch] **Added Runtime Type Guards** [CorrelationNode.tsx:23-36, ArithmeticNode.tsx:24-42] — Replaced unsafe `as unknown as` casts with `isValidCorrelationNodeData()` and `isValidArithmeticNodeData()` runtime validation functions.
- [x] [Review][Patch] **Fixed Input Count Type Validation** [ArithmeticNode.tsx:53-58] — Added `typeof === 'number'` check before Math operations to prevent NaN when `inputCount` is a non-numeric string.
- [x] [Review][Patch] **Added Edge Cleanup on Input Removal** [ArithmeticNode.tsx:78-96] — `removeInput()` now checks for and removes any connected edges before decreasing input count, preventing orphaned edges.
- [x] [Review][Patch] **Fixed crypto.randomUUID Insecure Context Crash** [NodeCanvas.tsx:265-278] — Added `generateNodeId()` helper with manual UUID v4 fallback for non-HTTPS contexts.
- [x] [Review][Patch] **Fixed Race Condition in Save Retry** [useNodeStore.ts:344-349] — `saveCanvasWithRetry()` now reads FRESH state from store on retry instead of using stale captured data parameter.
- [x] [Review][Patch] **Added Global Event Listener Cleanup** [useNodeStore.ts:414-432] — Added `registerAutoSaveListeners()` and `unregisterAutoSaveListeners()` functions to prevent listener accumulation in tests.
- [x] [Review][Patch] **Integrated Compatibility Matrix** [NodeCanvas.tsx:234-251] — Updated `isValidConnection()` to use `isTypeCompatible()` from portColors.ts instead of custom logic.
- [x] [Review][Patch] **Centralized Constants** [nodeConstants.ts] — Created shared constants file for MIN_INPUTS (2), MAX_INPUTS (5), debounce delays, and cache size options.

**Decision Resolved:**
- [x] [Review][Decision] **Arithmetic Operations Exceed Spec** — DECISION: Keep all operations. The extra operations (`sum`, `average`, `min`, `max`) provide valuable functionality beyond the minimal AC2 specification. No changes required.

### File List
