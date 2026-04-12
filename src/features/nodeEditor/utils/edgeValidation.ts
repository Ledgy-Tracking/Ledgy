/**
 * Graph Edge Validation
 * Story 4-8: Strict Edge Type Validation - AC5 Edge Persistence Validation
 *
 * Validates persisted edges when loading workflows and handles schema changes
 */

import type { Edge, Node } from '@xyflow/react';
import { getPortTypeFromHandle } from './getPortTypeFromHandle';
import { isTypeCompatible } from '../types/port';

/**
 * Validate all edges in the graph
 * Removes edges that don't pass type validation
 *
 * @param edges - Array of edges to validate
 * @param nodes - Array of nodes for type lookup
 * @returns Array of valid edges
 */
export const validateGraphEdges = (edges: Edge[], nodes: Node[]): Edge[] => {
    const validEdges: Edge[] = [];
    const invalidEdges: Edge[] = [];

    for (const edge of edges) {
        // Handle nullable edge handles gracefully
        if (!edge.sourceHandle || !edge.targetHandle) {
            invalidEdges.push(edge);
            if (process.env.NODE_ENV === 'development') {
                console.warn('[EdgeValidation] Removing edge with null handles:', {
                    edgeId: edge.id,
                    sourceHandle: edge.sourceHandle,
                    targetHandle: edge.targetHandle,
                });
            }
            continue;
        }

        const sourceType = getPortTypeFromHandle(edge.source, edge.sourceHandle, nodes);
        const targetType = getPortTypeFromHandle(edge.target, edge.targetHandle, nodes);

        // Guard against undefined/null types from getPortTypeFromHandle
        if (!sourceType || !targetType || !isTypeCompatible(sourceType, targetType)) {
            invalidEdges.push(edge);
            // Log removal for debugging
            if (process.env.NODE_ENV === 'development') {
                console.warn('[EdgeValidation] Removing invalid edge:', {
                    edgeId: edge.id,
                    source: `${edge.source}:${edge.sourceHandle}`,
                    target: `${edge.target}:${edge.targetHandle}`,
                    sourceType,
                    targetType,
                });
            }
        } else {
            validEdges.push(edge);
        }
    }

    if (invalidEdges.length > 0) {
        console.log(`[EdgeValidation] Removed ${invalidEdges.length} invalid edge(s) on graph load`);
    }

    return validEdges;
};

/**
 * Check if an edge is valid (for single edge validation)
 *
 * @param edge - Edge to validate
 * @param nodes - Array of nodes for type lookup
 * @returns boolean indicating if edge is valid
 */
export const isEdgeValid = (edge: Edge, nodes: Node[]): boolean => {
    // Handle nullable edge handles
    if (!edge.sourceHandle || !edge.targetHandle) {
        return false;
    }

    const sourceType = getPortTypeFromHandle(edge.source, edge.sourceHandle, nodes);
    const targetType = getPortTypeFromHandle(edge.target, edge.targetHandle, nodes);

    // Guard against undefined/null types
    if (!sourceType || !targetType) {
        return false;
    }

    return isTypeCompatible(sourceType, targetType);
};

/**
 * Get validation details for an edge
 * Useful for debugging and UI feedback
 */
export interface EdgeValidationDetails {
    edgeId: string;
    isValid: boolean;
    sourceType: string | null;
    targetType: string | null;
    reason?: string;
}

/**
 * Get detailed validation info for an edge
 *
 * @param edge - Edge to validate
 * @param nodes - Array of nodes for type lookup
 * @returns Validation details
 */
export const getEdgeValidationDetails = (edge: Edge, nodes: Node[]): EdgeValidationDetails => {
    // Handle nullable edge handles
    if (!edge.sourceHandle || !edge.targetHandle) {
        return {
            edgeId: edge.id,
            isValid: false,
            sourceType: null,
            targetType: null,
            reason: 'null_handle',
        };
    }

    const sourceType = getPortTypeFromHandle(edge.source, edge.sourceHandle, nodes);
    const targetType = getPortTypeFromHandle(edge.target, edge.targetHandle, nodes);

    // Guard against undefined/null types
    if (!sourceType || !targetType) {
        return {
            edgeId: edge.id,
            isValid: false,
            sourceType,
            targetType,
            reason: 'unknown_type',
        };
    }

    const isValid = isTypeCompatible(sourceType, targetType);

    return {
        edgeId: edge.id,
        isValid,
        sourceType,
        targetType,
        reason: isValid ? undefined : 'type_mismatch',
    };
};

/**
 * Find edges connected to a specific node
 *
 * @param edges - All edges
 * @param nodeId - Node ID to find connections for
 * @returns Object with incoming and outgoing edges
 */
export const getConnectedEdges = (edges: Edge[], nodeId: string): {
    incoming: Edge[];
    outgoing: Edge[];
} => {
    return {
        incoming: edges.filter(e => e.target === nodeId),
        outgoing: edges.filter(e => e.source === nodeId),
    };
};

/**
 * Find edges connected to a specific handle
 *
 * @param edges - All edges
 * @param nodeId - Node ID
 * @param handleId - Handle ID
 * @returns Array of connected edges
 */
export const getEdgesForHandle = (edges: Edge[], nodeId: string, handleId: string): Edge[] => {
    return edges.filter(e =>
        (e.source === nodeId && e.sourceHandle === handleId) ||
        (e.target === nodeId && e.targetHandle === handleId)
    );
};

/**
 * Remove all edges connected to a specific handle
 * Used when a field is deleted or type changes
 *
 * @param edges - All edges
 * @param nodeId - Node ID
 * @param handleId - Handle ID
 * @returns Filtered edges array
 */
export const removeEdgesForHandle = (edges: Edge[], nodeId: string, handleId: string): Edge[] => {
    const removed = edges.filter(e =>
        (e.source === nodeId && e.sourceHandle === handleId) ||
        (e.target === nodeId && e.targetHandle === handleId)
    );

    if (removed.length > 0 && process.env.NODE_ENV === 'development') {
        console.log('[EdgeValidation] Removing edges for deleted/modified handle:', {
            nodeId,
            handleId,
            removedCount: removed.length,
        });
    }

    return edges.filter(e =>
        !(e.source === nodeId && e.sourceHandle === handleId) &&
        !(e.target === nodeId && e.targetHandle === handleId)
    );
};

/**
 * Validation result for a complete graph
 */
export interface GraphValidationResult {
    isValid: boolean;
    validEdges: Edge[];
    invalidEdges: Edge[];
    errors: string[];
}

/**
 * Validate entire graph and return detailed results
 *
 * @param edges - All edges
 * @param nodes - All nodes
 * @returns Complete validation result
 */
export const validateGraph = (edges: Edge[], nodes: Node[]): GraphValidationResult => {
    const validEdges: Edge[] = [];
    const invalidEdges: Edge[] = [];
    const errors: string[] = [];

    for (const edge of edges) {
        // Handle nullable edge handles
        if (!edge.sourceHandle || !edge.targetHandle) {
            invalidEdges.push(edge);
            errors.push(`Edge ${edge.id}: null handle(s)`);
            continue;
        }

        const sourceType = getPortTypeFromHandle(edge.source, edge.sourceHandle, nodes);
        const targetType = getPortTypeFromHandle(edge.target, edge.targetHandle, nodes);

        // Guard against undefined/null types
        if (!sourceType || !targetType || !isTypeCompatible(sourceType, targetType)) {
            invalidEdges.push(edge);
            errors.push(
                `Edge ${edge.id}: ${sourceType || 'unknown'} → ${targetType || 'unknown'} type mismatch`
            );
        } else {
            validEdges.push(edge);
        }
    }

    return {
        isValid: invalidEdges.length === 0,
        validEdges,
        invalidEdges,
        errors,
    };
};
