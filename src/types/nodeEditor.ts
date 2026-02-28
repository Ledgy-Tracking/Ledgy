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

export type ComputeType = 'correlation' | 'arithmetic';
export type ArithmeticOperation = 'sum' | 'average' | 'min' | 'max';

export const ARITHMETIC_OPERATIONS: ArithmeticOperation[] = ['sum', 'average', 'min', 'max'];

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
