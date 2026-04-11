/**
 * Handle Type Resolution Utility
 * Story 4-8: Strict Edge Type Validation - AC4 Port Type Metadata Consistency
 *
 * Extracts port types from handle metadata across different node types
 */

import type { Node } from '@xyflow/react';
import type { PortType } from '../types/port';

/**
 * Extract port type from a handle ID and node data
 *
 * Handle ID formats by node type:
 * - LedgerSource: "{nodeId}:{fieldId}" - type from schemaSnapshot
 * - Correlation: "inputA", "inputB", "output" - fixed types
 * - Arithmetic: "input-{n}", "output" - fixed types
 * - Trigger: "trigger" - any type
 * - DashboardOutput: "output" - any type
 *
 * @param nodeId - The node ID
 * @param handleId - The handle ID (may be null)
 * @param nodes - Array of all nodes to look up the node
 * @returns PortType or null if type cannot be determined
 */
export const getPortTypeFromHandle = (
    nodeId: string,
    handleId: string | null | undefined,
    nodes: Node[]
): PortType | null => {
    if (!handleId) return null;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    switch (node.type) {
        case 'ledgerSource':
            return getLedgerSourcePortType(node, handleId);
        case 'correlation':
            return getCorrelationPortType(handleId);
        case 'arithmetic':
            return getArithmeticPortType(handleId);
        case 'trigger':
            return getTriggerPortType(handleId);
        case 'dashboardOutput':
            return getDashboardOutputPortType(handleId);
        default:
            // Unknown node type - return null for safety
            return null;
    }
};

/**
 * Get port type from Ledger Source node handle
 *
 * Handle ID format: "{nodeId}:{fieldId}"
 * Example: "ledger_abc123:field_xyz789"
 *
 * Type comes from schemaSnapshot field.type
 */
const getLedgerSourcePortType = (node: Node, handleId: string): PortType | null => {
    // Handle ID format: "{nodeId}:{fieldId}"
    // We need to extract the fieldId portion
    const parts = handleId.split(':');
    if (parts.length < 2) return null;

    // The fieldId is everything after the first colon
    // (handles edge cases where fieldId might contain colons)
    const fieldId = parts.slice(1).join(':');

    // Get schema from node data
    const schemaSnapshot = node.data?.schemaSnapshot;
    if (!Array.isArray(schemaSnapshot)) return null;

    // Find field by ID or name (backward compatibility)
    const field = schemaSnapshot.find(
        (f: { id?: string; name?: string; type?: string }) =>
            f.id === fieldId || f.name === fieldId
    );

    if (!field?.type) {
        // Development mode: log for debugging
        if (process.env.NODE_ENV === 'development') {
            console.warn('[EdgeValidation] Field not found for handle:', {
                nodeId: node.id,
                handleId,
                fieldId,
            });
        }
        return null;
    }

    // Validate and return the type
    return validatePortType(field.type);
};

/**
 * Get port type from Correlation node handle
 *
 * Handle IDs:
 * - "inputA": number[] (accepts number array)
 * - "inputB": number[] (accepts number array)
 * - "output": number (outputs correlation coefficient)
 */
const getCorrelationPortType = (handleId: string): PortType | null => {
    switch (handleId) {
        case 'inputA':
        case 'inputB':
            return 'number[]';
        case 'output':
            return 'number';
        default:
            return null;
    }
};

/**
 * Get port type from Arithmetic node handle
 *
 * Handle IDs:
 * - "input-{n}": number (accepts number)
 * - "output": number (outputs result)
 */
const getArithmeticPortType = (handleId: string): PortType | null => {
    // Input handles: "input-0", "input-1", etc.
    if (handleId.startsWith('input-')) {
        return 'number';
    }

    // Output handle
    if (handleId === 'output') {
        return 'number';
    }

    return null;
};

/**
 * Get port type from Trigger node handle
 *
 * Trigger outputs typically fire events that can be consumed by any input
 */
const getTriggerPortType = (handleId: string): PortType | null => {
    // Triggers use 'any' type as they can connect to various inputs
    switch (handleId) {
        case 'trigger':
        case 'output':
            return 'any';
        default:
            return null;
    }
};

/**
 * Get port type from Dashboard Output node handle
 *
 * Dashboard outputs accept any type for display
 */
const getDashboardOutputPortType = (handleId: string): PortType | null => {
    // Dashboard outputs accept any type
    switch (handleId) {
        case 'input':
        case 'value':
            return 'any';
        default:
            return null;
    }
};

/**
 * Validate that a string is a valid PortType
 * Returns null if the type is invalid
 */
const validatePortType = (type: string): PortType | null => {
    const validTypes: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];

    if (validTypes.includes(type as PortType)) {
        return type as PortType;
    }

    // Development mode: warn about unknown type
    if (process.env.NODE_ENV === 'development') {
        console.warn('[EdgeValidation] Unknown port type:', type);
    }

    return null;
};

/**
 * Get source port type from a connection
 * Convenience wrapper for connection validation
 */
export const getSourcePortType = (
    sourceNodeId: string,
    sourceHandleId: string | null | undefined,
    nodes: Node[]
): PortType | null => {
    return getPortTypeFromHandle(sourceNodeId, sourceHandleId, nodes);
};

/**
 * Get target port type from a connection
 * Convenience wrapper for connection validation
 */
export const getTargetPortType = (
    targetNodeId: string,
    targetHandleId: string | null | undefined,
    nodes: Node[]
): PortType | null => {
    return getPortTypeFromHandle(targetNodeId, targetHandleId, nodes);
};
