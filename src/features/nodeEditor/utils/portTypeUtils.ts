/**
 * Port type extraction utilities
 * Story 4-7: Complex Edge Connection Snapping (AC4)
 * 
 * Extracts port types from handle IDs based on node types
 * defined in stories 4-5 (Ledger Source) and 4-6 (Correlation/Arithmetic)
 */

import type { Node } from '@xyflow/react';
import type { PortType } from '../types/connection';
import type { CanvasNode } from '../../../types/nodeEditor';

/**
 * Schema field from Ledger Source node
 */
interface SchemaField {
    id?: string;
    name?: string;
    type?: string;
}

/**
 * Extract port type from a handle ID based on node type
 * 
 * Handle ID formats:
 * - Ledger Source outputs: "{nodeId}:{fieldId}" (e.g., "node_abc123:field_xyz789")
 * - Correlation nodes: "inputA", "inputB", "output"
 * - Arithmetic nodes: "input0", "input1", ..., "output"
 * 
 * @param nodeId - The node ID
 * @param handleId - The handle ID
 * @param nodes - Array of all nodes
 * @returns PortType or null if not determinable
 */
export const getPortTypeFromHandle = (
    nodeId: string,
    handleId: string,
    nodes: Node[]
): PortType | null => {
    const node = nodes.find(n => n.id === nodeId) as CanvasNode | undefined;
    if (!node) return null;

    // Ledger Source: handleId = "{nodeId}:{fieldId}"
    if (node.type === 'ledgerSource' && handleId.includes(':')) {
        const parts = handleId.split(':');
        if (parts.length < 2) return null;
        const fieldId = parts.slice(1).join(':'); // Everything after first colon
        if (!fieldId) return null;

        const schemaSnapshot = node.data?.schemaSnapshot as SchemaField[] | undefined;
        if (schemaSnapshot) {
            const field = schemaSnapshot.find(
                (f: SchemaField) => f.id === fieldId || f.name === fieldId
            );
            if (field?.type) {
                return normalizePortType(field.type);
            }
        }
        return null;
    }

    // Correlation Node: fixed handle types
    if (node.type === 'correlation') {
        if (handleId === 'inputA' || handleId === 'inputB') return 'number[]';
        if (handleId === 'output') return 'number';
    }

    // Arithmetic Node: dynamic input count, single output
    if (node.type === 'arithmetic') {
        if (handleId === 'output') return 'number';
        if (handleId.startsWith('input')) return 'number';
    }

    // Trigger Node
    if (node.type === 'trigger') {
        if (handleId === 'output') return 'any';
    }

    // Dashboard Output Node
    if (node.type === 'dashboardOutput') {
        if (handleId.startsWith('input')) return 'any';
    }

    // Legacy format: "type-{portType}" or "handle-{portType}"
    if (handleId.includes('-')) {
        const parts = handleId.split('-');
        const potentialType = parts[parts.length - 1];
        const normalized = normalizePortType(potentialType);
        if (normalized) return normalized;
    }

    return null;
};

/**
 * Normalize a string to a valid PortType
 */
const normalizePortType = (type: unknown): PortType | null => {
    // Guard against non-string inputs
    if (typeof type !== 'string') return null;
    
    const validTypes: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];
    
    // Direct match
    if (validTypes.includes(type as PortType)) {
        return type as PortType;
    }

    // Normalize common variations
    const normalized = type.toLowerCase().trim();
    
    switch (normalized) {
        case 'number':
        case 'num':
        case 'float':
        case 'int':
        case 'integer':
        case 'decimal':
            return 'number';
        case 'number[]':
        case 'numberarray':
        case 'num[]':
        case 'array':
        case 'numbers':
            return 'number[]';
        case 'text':
        case 'string':
        case 'str':
        case 'varchar':
            return 'text';
        case 'date':
        case 'datetime':
        case 'timestamp':
        case 'time':
            return 'date';
        case 'boolean':
        case 'bool':
            return 'boolean';
        case 'relation':
        case 'ref':
        case 'reference':
        case 'link':
            return 'relation';
        case 'any':
        case 'unknown':
        case 'mixed':
            return 'any';
        default:
            return null;
    }
};

/**
 * Get port type from source handle for connection validation
 * Convenience wrapper that handles the connection object format
 */
export const getSourcePortType = (
    sourceNodeId: string,
    sourceHandleId: string | null | undefined,
    nodes: Node[]
): PortType | null => {
    if (!sourceHandleId) return null;
    return getPortTypeFromHandle(sourceNodeId, sourceHandleId, nodes);
};

/**
 * Get port type from target handle for connection validation
 */
export const getTargetPortType = (
    targetNodeId: string,
    targetHandleId: string | null | undefined,
    nodes: Node[]
): PortType | null => {
    if (!targetHandleId) return null;
    return getPortTypeFromHandle(targetNodeId, targetHandleId, nodes);
};

/**
 * Type compatibility matrix for port connections
 * Based on AC4 specification
 */
export const portCompatibilityMatrix: Record<PortType, PortType[]> = {
    number: ['number', 'number[]', 'any'],
    'number[]': ['number[]', 'any'],
    text: ['text', 'any'],
    date: ['date', 'any'],
    boolean: ['boolean', 'any'],
    relation: ['relation', 'any'],
    any: ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any']
};

/**
 * Check if a connection between two port types is valid
 */
export const arePortTypesCompatible = (
    sourceType: PortType | null,
    targetType: PortType | null
): boolean => {
    if (!sourceType || !targetType) return true; // Allow if types unknown
    if (sourceType === targetType) return true;
    if (targetType === 'any') return true;
    
    return portCompatibilityMatrix[sourceType]?.includes(targetType) ?? false;
};

/**
 * Get a human-readable description of a port type
 */
export const getPortTypeDescription = (type: PortType | null): string => {
    if (!type) return 'Unknown';
    
    const descriptions: Record<PortType, string> = {
        number: 'Number',
        'number[]': 'Number Array',
        text: 'Text',
        date: 'Date',
        boolean: 'Boolean',
        relation: 'Relation',
        any: 'Any Type'
    };
    
    return descriptions[type] || type;
};
