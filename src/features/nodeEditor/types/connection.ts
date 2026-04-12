/**
 * Connection-related types for edge snapping and drag operations
 * Story 4-7: Complex Edge Connection Snapping
 */

import type { XYPosition } from '@xyflow/react';

/**
 * Port types established in stories 4-5 and 4-6
 */
export type PortType = 'number' | 'number[]' | 'text' | 'date' | 'boolean' | 'relation' | 'any';

/**
 * Handle position for snap detection
 */
export interface HandlePosition {
    id: string;
    nodeId: string;
    x: number;
    y: number;
    type: PortType;
    direction: 'input' | 'output';
}

/**
 * Snap detection result
 */
export interface SnapResult {
    snapped: boolean;
    handleId?: string;
    nodeId?: string;
    position: XYPosition;
    isValid: boolean; // Type compatibility
}

/**
 * Connection line state during drag
 */
export interface ConnectionLineState {
    isDragging: boolean;
    sourceHandleId: string;
    sourceNodeId: string;
    currentPosition: XYPosition;
    snapResult: SnapResult | null;
}

/**
 * Edge styling configuration
 */
export interface EdgeStyleConfig {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
    filter?: string; // For glow effects
}

/**
 * Bezier control points for curved connection lines
 */
export interface BezierControlPoints {
    sourceControl: XYPosition;
    targetControl: XYPosition;
}

/**
 * Handle highlight state for visual feedback
 */
export interface HandleHighlightState {
    handleId: string;
    nodeId: string;
    state: 'default' | 'compatible' | 'incompatible' | 'snapped';
}

/**
 * Connection validation result
 */
export interface ConnectionValidationResult {
    isValid: boolean;
    sourceType?: PortType;
    targetType?: PortType;
    errorMessage?: string;
}
