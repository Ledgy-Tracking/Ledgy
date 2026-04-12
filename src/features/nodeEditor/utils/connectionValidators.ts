import { useCallback } from 'react';
import { type Connection, useReactFlow } from '@xyflow/react';
import { LedgerSourceNodeData } from '@/types/nodeEditor';

// Field type colors for handles
export const typeColorMap: Record<string, string> = {
    text: '#a1a1aa',     // zinc-400
    number: '#3b82f6',   // blue-500
    date: '#f59e0b',     // amber-500
    relation: '#a855f7', // purple-500
};

// Type compatibility matrix for connection validation
const compatibilityMatrix: Record<string, string[]> = {
    text: ['text', 'any'],
    number: ['number', 'correlationInput', 'mathOperand'],
    date: ['date', 'dayExtractor'],
    relation: ['relation', 'entryLookup'],
};

// Error messages for invalid connections
const errorMessages: Record<string, Record<string, string>> = {
    text: {
        number: 'Text cannot connect to Number. Try converting first.',
        mathOperand: 'Text cannot be used in math operations.',
    },
    number: {
        text: 'Number cannot connect to Text. Use a formatter node.',
    },
    date: {
        text: 'Date cannot be concatenated. Format to text first.',
    },
    relation: {
        mathOperand: 'Relation cannot be used in math operations.',
        number: 'Relation cannot be used in math operations.',
    },
};

/**
 * Extract field type from Ledger Source node data
 * Story 4.5 - Runtime type guards for field type extraction
 */
const extractFieldType = (nodeData: unknown, fieldId: string): string | null => {
    // Runtime type guard
    if (!nodeData || typeof nodeData !== 'object') return null;

    const data = nodeData as LedgerSourceNodeData;
    if (data.type !== 'ledgerSource') return null;
    if (!Array.isArray(data.schemaSnapshot)) return null;

    const field = data.schemaSnapshot.find(f => f?.id === fieldId);
    return field?.type ?? null;
};

/**
 * Extract target type from node data
 * Story 4.5 - Runtime type guards for target type extraction
 */
const extractTargetType = (nodeData: unknown, handleId: string): string | null => {
    if (!nodeData || typeof nodeData !== 'object') return null;

    const data = nodeData as {
        type?: string;
        targetType?: string;
        inputType?: string;
        inputConfig?: { type?: string };
    };

    // Handle different node types
    if (data.type === 'correlation') {
        if (handleId.includes('inputA') || handleId.includes('inputB')) {
            return 'correlationInput';
        }
    }

    if (data.type === 'math' || data.type === 'arithmetic') {
        return 'mathOperand';
    }

    if (data.type === 'dashboard') {
        return 'any';
    }

    return data?.targetType ?? data?.inputType ?? data?.inputConfig?.type ?? null;
};

export interface UseConnectionValidatorReturn {
    isValidConnection: (connection: Connection) => boolean;
    getConnectionError: (connection: Connection) => string | null;
    getFieldTypeColor: (fieldType: string) => string;
}

/**
 * Hook for validating connections between nodes
 * Story 4.5 - Edge connection type validation
 */
export const useConnectionValidator = (): UseConnectionValidatorReturn => {
    const { getNode } = useReactFlow();

    const isValidConnection = useCallback((connection: Connection): boolean => {
        const sourceNode = getNode(connection.source);
        const targetNode = getNode(connection.target);

        if (!sourceNode || !targetNode) return false;

        // Extract type from handle IDs (format: "nodeId:fieldId")
        const sourceHandleParts = connection.sourceHandle?.split(':');
        const targetHandleParts = connection.targetHandle?.split(':');
        if (!sourceHandleParts || !targetHandleParts) return false;

        const fieldId = sourceHandleParts[sourceHandleParts.length - 1];
        const sourceType = extractFieldType(sourceNode.data, fieldId);
        const targetType = extractTargetType(targetNode.data, targetHandleParts[targetHandleParts.length - 1]);

        if (!sourceType || !targetType) return false;

        return compatibilityMatrix[sourceType]?.includes(targetType) ?? false;
    }, [getNode]);

    const getConnectionError = useCallback((connection: Connection): string | null => {
        const sourceNode = getNode(connection.source);
        const targetNode = getNode(connection.target);

        if (!sourceNode || !targetNode) return 'Invalid connection: node not found';

        const sourceHandleParts = connection.sourceHandle?.split(':');
        const targetHandleParts = connection.targetHandle?.split(':');
        if (!sourceHandleParts || !targetHandleParts) {
            return 'Invalid connection: handle format error';
        }

        const fieldId = sourceHandleParts[sourceHandleParts.length - 1];
        const sourceType = extractFieldType(sourceNode.data, fieldId);
        const targetType = extractTargetType(targetNode.data, targetHandleParts[targetHandleParts.length - 1]);

        if (!sourceType) return 'Invalid connection: source type unknown';
        if (!targetType) return 'Invalid connection: target type unknown';

        if (compatibilityMatrix[sourceType]?.includes(targetType)) {
            return null;
        }

        return errorMessages[sourceType]?.[targetType] 
            ?? `${sourceType} cannot connect to ${targetType}. Check type compatibility.`;
    }, [getNode]);

    const getFieldTypeColor = useCallback((fieldType: string): string => {
        return typeColorMap[fieldType] ?? '#a1a1aa'; // Default to zinc
    }, []);

    return { isValidConnection, getConnectionError, getFieldTypeColor };
};

/**
 * Get converter node suggestions for invalid connections
 * Story 4.5a - Converter node discovery
 */
export const getConverterSuggestions = (sourceType: string, targetType: string): string[] => {
    const suggestions: Record<string, Record<string, string[]>> = {
        text: {
            number: ['Text→Number Parser', 'Extract Numeric Values'],
        },
        number: {
            text: ['Number Formatter', 'ToString Node'],
        },
        date: {
            text: ['Date Formatter', 'Format Date Node'],
        },
    };

    return suggestions[sourceType]?.[targetType] ?? [];
};
