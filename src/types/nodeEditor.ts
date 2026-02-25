import { LedgyDocument } from './profile';

/**
 * React Flow node data structure
 */
export interface NodeData {
    label: string;
    ledgerId?: string;
    type?: 'source' | 'compute' | 'trigger' | 'output';
}

/**
 * Node canvas document
 */
export interface NodeCanvas extends LedgyDocument {
    type: 'canvas';
    profileId: string;
    canvasId: string; // e.g., 'default' for main canvas
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
}

/**
 * Canvas node extending React Flow node
 */
export interface CanvasNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: NodeData;
}

/**
 * Canvas edge extending React Flow edge
 */
export interface CanvasEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

/**
 * Viewport state
 */
export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

/**
 * Node store state
 */
export interface NodeState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
    isLoading: boolean;
    error: string | null;
}
