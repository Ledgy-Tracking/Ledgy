import { Node, Edge } from '@xyflow/react';
import { LedgyDocument } from './profile';
import { SchemaField, LedgerEntry } from './ledger';

/**
 * React Flow node data structure
 */
export interface NodeData {
    label: string;
    ledgerId?: string;
    type?: 'source' | 'compute' | 'trigger' | 'output';
    result?: number;
    error?: string;
    chartData?: any[];
    trend?: string;
    changePercent?: number;
    isComputing?: boolean;
    widgetId?: string;
    widgetType?: string;
    title?: string;
    operation?: string;
    ports?: any[];
    // Index signature to satisfy React Flow's Node<T> constraint
    [key: string]: any;
}

/**
 * Ledger Source Node Data - Story 4.5
 * Complete data structure for ledger source nodes
 */
export interface LedgerSourceNodeData {
    type: 'ledgerSource';
    ledgerId: string;
    ledgerName: string;
    schemaSnapshot: SchemaField[];
    showFieldTypes: boolean;
    showLatestValues: boolean;
    cacheSize: number;
    // NOTE: entryCache intentionally NOT stored in node data
    // Entries fetched dynamically via useLedgerSourceData hook
    // to prevent PouchDB write storms on every data change
    lastUpdated?: string;
    isStale?: boolean;
}

/**
 * Container Node Data - Story 4.9
 * Data structure for container/group nodes
 */
export interface ContainerNodeData {
    type: 'container';
    label: string;
    isCollapsed: boolean;
    childNodeIds: string[];
    createdAt: string;
}

/**
 * Ledger cache entry for shared data management
 */
export interface LedgerCacheEntry {
    entries: LedgerEntry[];
    refCount: number;
    lastUpdated: string;
    expiresAt: number;
}

/**
 * Canvas node type - extends React Flow Node with custom data
 */
export type CanvasNode = Node<NodeData, string>;

/**
 * Canvas edge type - extends React Flow Edge
 */
export type CanvasEdge = Edge<any>;

/**
 * Node canvas document
 */
export interface NodeCanvas extends LedgyDocument {
    type: 'canvas';
    profileId: string;
    canvasId: string; // e.g., 'default' for main canvas
    nodes: CanvasNode[];
    nodes_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    edges: CanvasEdge[];
    edges_enc?: {
        iv: number[];
        ciphertext: number[];
    };
    viewport: Viewport;
    viewControls?: ViewControlsState; // Optional for backward compatibility
}

/**
 * Viewport state
 */
export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export type ComputeType = 'correlation' | 'arithmetic';
export type ArithmeticOperation = 'sum' | 'average' | 'min' | 'max';

export const ARITHMETIC_OPERATIONS: ArithmeticOperation[] = ['sum', 'average', 'min', 'max'];

/**
 * WorkflowScript document — metadata for a named Node Forge workflow.
 * Canvas data (nodes/edges) is stored separately in a NodeCanvas document.
 */
export interface WorkflowScript extends LedgyDocument {
    type: 'workflow';
    profileId: string;
    projectId: string;
    name: string;
    description?: string;
    scope: 'project'; // 'profile' reserved for story 4.17
}

/**
 * View controls state for navigation (Story 4.4)
 */
export interface ViewControlsState {
    showMinimap: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
    isViewControlsCollapsed?: boolean; // Optional for backward compatibility
}

/**
 * Default view controls for backward compatibility
 */
export const DEFAULT_VIEW_CONTROLS: ViewControlsState = {
    showMinimap: true,
    showGrid: true,
    snapToGrid: false,
    gridSize: 15,
    isViewControlsCollapsed: false,
};

/**
 * Node store state
 */
export interface NodeState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
    isLoading: boolean;
    error: string | null;
    // Ledger data cache for shared subscriptions (Story 4.5)
    ledgerDataCache?: Map<string, LedgerCacheEntry>;
}
