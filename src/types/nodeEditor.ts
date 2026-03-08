import { Node, Edge } from '@xyflow/react';
import { LedgyDocument } from './profile';

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
