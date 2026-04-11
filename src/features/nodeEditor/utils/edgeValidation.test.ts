import { describe, it, expect } from 'vitest';
import {
    validateGraphEdges,
    isEdgeValid,
    getEdgeValidationDetails,
    getConnectedEdges,
    getEdgesForHandle,
    removeEdgesForHandle,
    validateGraph,
} from './edgeValidation';
import type { Edge, Node } from '@xyflow/react';

/**
 * Test data for edge validation tests
 */

// Ledger Source Node with schema
const ledgerSourceNode: Node = {
    id: 'ledger_1',
    type: 'ledgerSource',
    position: { x: 0, y: 0 },
    data: {
        schemaSnapshot: [
            { id: 'field_number', name: 'amount', type: 'number' },
            { id: 'field_text', name: 'name', type: 'text' },
            { id: 'field_array', name: 'values', type: 'number[]' },
        ],
    },
};

// Correlation Node
const correlationNode: Node = {
    id: 'corr_1',
    type: 'correlation',
    position: { x: 200, y: 0 },
    data: {},
};

// Arithmetic Node
const arithmeticNode: Node = {
    id: 'arith_1',
    type: 'arithmetic',
    position: { x: 400, y: 0 },
    data: { inputCount: 2 },
};

const testNodes = [ledgerSourceNode, correlationNode, arithmeticNode];

describe('validateGraphEdges', () => {
    it('should keep valid edges', () => {
        const edges: Edge[] = [
            {
                id: 'edge_1',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-0',
            },
        ];

        const validEdges = validateGraphEdges(edges, testNodes);
        expect(validEdges).toHaveLength(1);
        expect(validEdges[0].id).toBe('edge_1');
    });

    it('should remove invalid edges (type mismatch)', () => {
        const edges: Edge[] = [
            {
                id: 'edge_1',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_text', // text type
                target: 'arith_1',
                targetHandle: 'input-0', // expects number
            },
        ];

        const validEdges = validateGraphEdges(edges, testNodes);
        expect(validEdges).toHaveLength(0);
    });

    it('should allow number to number[] coercion', () => {
        const edges: Edge[] = [
            {
                id: 'edge_1',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number', // number type
                target: 'corr_1',
                targetHandle: 'inputA', // expects number[]
            },
        ];

        const validEdges = validateGraphEdges(edges, testNodes);
        expect(validEdges).toHaveLength(1);
    });

    it('should keep multiple valid edges', () => {
        const edges: Edge[] = [
            {
                id: 'edge_1',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-0',
            },
            {
                id: 'edge_2',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-1',
            },
        ];

        const validEdges = validateGraphEdges(edges, testNodes);
        expect(validEdges).toHaveLength(2);
    });

    it('should filter out invalid edges while keeping valid ones', () => {
        const edges: Edge[] = [
            {
                id: 'edge_valid',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-0',
            },
            {
                id: 'edge_invalid',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_text',
                target: 'arith_1',
                targetHandle: 'input-1',
            },
        ];

        const validEdges = validateGraphEdges(edges, testNodes);
        expect(validEdges).toHaveLength(1);
        expect(validEdges[0].id).toBe('edge_valid');
    });

    it('should handle empty edge array', () => {
        const validEdges = validateGraphEdges([], testNodes);
        expect(validEdges).toEqual([]);
    });

    it('should handle edges with unknown nodes', () => {
        const edges: Edge[] = [
            {
                id: 'edge_1',
                source: 'unknown_node',
                sourceHandle: 'handle',
                target: 'ledger_1',
                targetHandle: 'ledger_1:field_number',
            },
        ];

        const validEdges = validateGraphEdges(edges, testNodes);
        expect(validEdges).toHaveLength(0);
    });
});

describe('isEdgeValid', () => {
    it('should return true for valid edge', () => {
        const edge: Edge = {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_number',
            target: 'arith_1',
            targetHandle: 'input-0',
        };

        expect(isEdgeValid(edge, testNodes)).toBe(true);
    });

    it('should return false for invalid edge', () => {
        const edge: Edge = {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_text',
            target: 'arith_1',
            targetHandle: 'input-0',
        };

        expect(isEdgeValid(edge, testNodes)).toBe(false);
    });
});

describe('getEdgeValidationDetails', () => {
    it('should return details for valid edge', () => {
        const edge: Edge = {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_number',
            target: 'arith_1',
            targetHandle: 'input-0',
        };

        const details = getEdgeValidationDetails(edge, testNodes);
        expect(details.edgeId).toBe('edge_1');
        expect(details.isValid).toBe(true);
        expect(details.sourceType).toBe('number');
        expect(details.targetType).toBe('number');
        expect(details.reason).toBeUndefined();
    });

    it('should return details for invalid edge', () => {
        const edge: Edge = {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_text',
            target: 'arith_1',
            targetHandle: 'input-0',
        };

        const details = getEdgeValidationDetails(edge, testNodes);
        expect(details.isValid).toBe(false);
        expect(details.sourceType).toBe('text');
        expect(details.targetType).toBe('number');
        expect(details.reason).toBe('type_mismatch');
    });

    it('should handle unknown types', () => {
        const edge: Edge = {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:nonexistent',
            target: 'arith_1',
            targetHandle: 'input-0',
        };

        const details = getEdgeValidationDetails(edge, testNodes);
        expect(details.sourceType).toBeNull();
        // When source type is unknown, the reason should indicate unknown_type
        expect(details.reason).toBe('unknown_type');
    });
});

describe('getConnectedEdges', () => {
    const edges: Edge[] = [
        {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_number',
            target: 'arith_1',
            targetHandle: 'input-0',
        },
        {
            id: 'edge_2',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_text',
            target: 'corr_1',
            targetHandle: 'inputA',
        },
        {
            id: 'edge_3',
            source: 'arith_1',
            sourceHandle: 'output',
            target: 'corr_1',
            targetHandle: 'inputB',
        },
    ];

    it('should find incoming edges', () => {
        const connected = getConnectedEdges(edges, 'arith_1');
        expect(connected.incoming).toHaveLength(1);
        expect(connected.incoming[0].id).toBe('edge_1');
    });

    it('should find outgoing edges', () => {
        const connected = getConnectedEdges(edges, 'ledger_1');
        expect(connected.outgoing).toHaveLength(2);
    });

    it('should find both incoming and outgoing edges', () => {
        const connected = getConnectedEdges(edges, 'corr_1');
        expect(connected.incoming).toHaveLength(2);
        expect(connected.outgoing).toHaveLength(0);
    });

    it('should return empty arrays for node with no connections', () => {
        const connected = getConnectedEdges(edges, 'unknown_node');
        expect(connected.incoming).toHaveLength(0);
        expect(connected.outgoing).toHaveLength(0);
    });
});

describe('getEdgesForHandle', () => {
    const edges: Edge[] = [
        {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_number',
            target: 'arith_1',
            targetHandle: 'input-0',
        },
        {
            id: 'edge_2',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_number',
            target: 'arith_1',
            targetHandle: 'input-1',
        },
        {
            id: 'edge_3',
            source: 'arith_1',
            sourceHandle: 'output',
            target: 'corr_1',
            targetHandle: 'inputA',
        },
    ];

    it('should find edges by source handle', () => {
        const handleEdges = getEdgesForHandle(edges, 'ledger_1', 'ledger_1:field_number');
        expect(handleEdges).toHaveLength(2);
    });

    it('should find edge by target handle', () => {
        const handleEdges = getEdgesForHandle(edges, 'arith_1', 'input-0');
        expect(handleEdges).toHaveLength(1);
        expect(handleEdges[0].id).toBe('edge_1');
    });

    it('should find output handle edge', () => {
        const handleEdges = getEdgesForHandle(edges, 'arith_1', 'output');
        expect(handleEdges).toHaveLength(1);
    });

    it('should return empty array for handle with no edges', () => {
        const handleEdges = getEdgesForHandle(edges, 'ledger_1', 'ledger_1:field_text');
        expect(handleEdges).toHaveLength(0);
    });
});

describe('removeEdgesForHandle', () => {
    const edges: Edge[] = [
        {
            id: 'edge_1',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_number',
            target: 'arith_1',
            targetHandle: 'input-0',
        },
        {
            id: 'edge_2',
            source: 'ledger_1',
            sourceHandle: 'ledger_1:field_text',
            target: 'arith_1',
            targetHandle: 'input-1',
        },
        {
            id: 'edge_3',
            source: 'arith_1',
            sourceHandle: 'output',
            target: 'corr_1',
            targetHandle: 'inputA',
        },
    ];

    it('should remove edges for specific handle', () => {
        const remaining = removeEdgesForHandle(edges, 'ledger_1', 'ledger_1:field_number');
        expect(remaining).toHaveLength(2);
        expect(remaining.find(e => e.id === 'edge_1')).toBeUndefined();
    });

    it('should remove target handle edges', () => {
        const remaining = removeEdgesForHandle(edges, 'arith_1', 'input-0');
        expect(remaining).toHaveLength(2);
        expect(remaining.find(e => e.id === 'edge_1')).toBeUndefined();
    });

    it('should keep all edges if no match', () => {
        const remaining = removeEdgesForHandle(edges, 'ledger_1', 'nonexistent');
        expect(remaining).toHaveLength(3);
    });

    it('should return empty array if all edges removed', () => {
        const singleEdge: Edge[] = [edges[0]];
        const remaining = removeEdgesForHandle(singleEdge, 'ledger_1', 'ledger_1:field_number');
        expect(remaining).toHaveLength(0);
    });
});

describe('validateGraph', () => {
    it('should validate graph with all valid edges', () => {
        const edges: Edge[] = [
            {
                id: 'edge_1',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-0',
            },
            {
                id: 'edge_2',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-1',
            },
        ];

        const result = validateGraph(edges, testNodes);
        expect(result.isValid).toBe(true);
        expect(result.validEdges).toHaveLength(2);
        expect(result.invalidEdges).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
    });

    it('should validate graph with mixed valid/invalid edges', () => {
        const edges: Edge[] = [
            {
                id: 'edge_valid',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_number',
                target: 'arith_1',
                targetHandle: 'input-0',
            },
            {
                id: 'edge_invalid',
                source: 'ledger_1',
                sourceHandle: 'ledger_1:field_text',
                target: 'arith_1',
                targetHandle: 'input-1',
            },
        ];

        const result = validateGraph(edges, testNodes);
        expect(result.isValid).toBe(false);
        expect(result.validEdges).toHaveLength(1);
        expect(result.invalidEdges).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('edge_invalid');
    });

    it('should handle empty graph', () => {
        const result = validateGraph([], testNodes);
        expect(result.isValid).toBe(true);
        expect(result.validEdges).toHaveLength(0);
    });
});
