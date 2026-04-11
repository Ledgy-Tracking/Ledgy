import { describe, it, expect } from 'vitest';
import {
    getPortTypeFromHandle,
    getSourcePortType,
    getTargetPortType,
} from './getPortTypeFromHandle';
import type { Node } from '@xyflow/react';

describe('getPortTypeFromHandle', () => {
    // Test data: Ledger Source Node
    const ledgerSourceNode: Node = {
        id: 'ledger_abc123',
        type: 'ledgerSource',
        position: { x: 0, y: 0 },
        data: {
            ledgerId: 'ledger_xyz',
            ledgerName: 'Test Ledger',
            schemaSnapshot: [
                { id: 'field_1', name: 'amount', type: 'number' },
                { id: 'field_2', name: 'description', type: 'text' },
                { id: 'field_3', name: 'createdAt', type: 'date' },
                { id: 'field_4', name: 'isActive', type: 'boolean' },
                { id: 'field_5', name: 'relatedEntry', type: 'relation' },
                { id: 'field_6', name: 'values', type: 'number[]' },
            ],
        },
    };

    // Test data: Correlation Node
    const correlationNode: Node = {
        id: 'corr_abc123',
        type: 'correlation',
        position: { x: 100, y: 100 },
        data: {
            correlationType: 'pearson',
        },
    };

    // Test data: Arithmetic Node
    const arithmeticNode: Node = {
        id: 'arith_abc123',
        type: 'arithmetic',
        position: { x: 200, y: 200 },
        data: {
            operation: 'add',
            inputCount: 2,
        },
    };

    // Test data: Trigger Node
    const triggerNode: Node = {
        id: 'trigger_abc123',
        type: 'trigger',
        position: { x: 300, y: 300 },
        data: {},
    };

    // Test data: Dashboard Output Node
    const dashboardOutputNode: Node = {
        id: 'dash_abc123',
        type: 'dashboardOutput',
        position: { x: 400, y: 400 },
        data: {},
    };

    const allNodes = [
        ledgerSourceNode,
        correlationNode,
        arithmeticNode,
        triggerNode,
        dashboardOutputNode,
    ];

    describe('Ledger Source Node', () => {
        it('should extract number type from ledger source handle', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:field_1',
                allNodes
            );
            expect(type).toBe('number');
        });

        it('should extract text type from ledger source handle', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:field_2',
                allNodes
            );
            expect(type).toBe('text');
        });

        it('should extract date type from ledger source handle', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:field_3',
                allNodes
            );
            expect(type).toBe('date');
        });

        it('should extract boolean type from ledger source handle', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:field_4',
                allNodes
            );
            expect(type).toBe('boolean');
        });

        it('should extract relation type from ledger source handle', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:field_5',
                allNodes
            );
            expect(type).toBe('relation');
        });

        it('should extract number[] type from ledger source handle', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:field_6',
                allNodes
            );
            expect(type).toBe('number[]');
        });

        it('should return null for non-existent field', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:nonexistent',
                allNodes
            );
            expect(type).toBeNull();
        });

        it('should return null for invalid handle format', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'invalidformat',
                allNodes
            );
            expect(type).toBeNull();
        });

        it('should handle field lookup by name for backward compatibility', () => {
            const type = getPortTypeFromHandle(
                'ledger_abc123',
                'ledger_abc123:amount', // Using name instead of ID
                allNodes
            );
            expect(type).toBe('number');
        });

        it('should return null when node not found', () => {
            const type = getPortTypeFromHandle(
                'nonexistent_node',
                'nonexistent_node:field',
                allNodes
            );
            expect(type).toBeNull();
        });

        it('should return null when schemaSnapshot is missing', () => {
            const nodeWithoutSchema: Node = {
                id: 'ledger_no_schema',
                type: 'ledgerSource',
                position: { x: 0, y: 0 },
                data: { ledgerId: 'test' }, // No schemaSnapshot
            };
            const type = getPortTypeFromHandle(
                'ledger_no_schema',
                'ledger_no_schema:field',
                [nodeWithoutSchema]
            );
            expect(type).toBeNull();
        });
    });

    describe('Correlation Node', () => {
        it('should return number[] for inputA', () => {
            const type = getPortTypeFromHandle('corr_abc123', 'inputA', allNodes);
            expect(type).toBe('number[]');
        });

        it('should return number[] for inputB', () => {
            const type = getPortTypeFromHandle('corr_abc123', 'inputB', allNodes);
            expect(type).toBe('number[]');
        });

        it('should return number for output', () => {
            const type = getPortTypeFromHandle('corr_abc123', 'output', allNodes);
            expect(type).toBe('number');
        });

        it('should return null for unknown handle', () => {
            const type = getPortTypeFromHandle('corr_abc123', 'unknown', allNodes);
            expect(type).toBeNull();
        });
    });

    describe('Arithmetic Node', () => {
        it('should return number for input-0', () => {
            const type = getPortTypeFromHandle('arith_abc123', 'input-0', allNodes);
            expect(type).toBe('number');
        });

        it('should return number for input-1', () => {
            const type = getPortTypeFromHandle('arith_abc123', 'input-1', allNodes);
            expect(type).toBe('number');
        });

        it('should return number for output', () => {
            const type = getPortTypeFromHandle('arith_abc123', 'output', allNodes);
            expect(type).toBe('number');
        });

        it('should return number for any input-N', () => {
            for (let i = 0; i < 5; i++) {
                const type = getPortTypeFromHandle('arith_abc123', `input-${i}`, allNodes);
                expect(type).toBe('number');
            }
        });

        it('should return null for invalid input format', () => {
            const type = getPortTypeFromHandle('arith_abc123', 'input', allNodes);
            expect(type).toBeNull();
        });
    });

    describe('Trigger Node', () => {
        it('should return any for trigger handle', () => {
            const type = getPortTypeFromHandle('trigger_abc123', 'trigger', allNodes);
            expect(type).toBe('any');
        });

        it('should return any for output handle', () => {
            const type = getPortTypeFromHandle('trigger_abc123', 'output', allNodes);
            expect(type).toBe('any');
        });
    });

    describe('Dashboard Output Node', () => {
        it('should return any for input handle', () => {
            const type = getPortTypeFromHandle('dash_abc123', 'input', allNodes);
            expect(type).toBe('any');
        });

        it('should return any for value handle', () => {
            const type = getPortTypeFromHandle('dash_abc123', 'value', allNodes);
            expect(type).toBe('any');
        });
    });

    describe('Edge cases', () => {
        it('should return null for null handleId', () => {
            const type = getPortTypeFromHandle('ledger_abc123', null, allNodes);
            expect(type).toBeNull();
        });

        it('should return null for undefined handleId', () => {
            const type = getPortTypeFromHandle('ledger_abc123', undefined, allNodes);
            expect(type).toBeNull();
        });

        it('should return null for unknown node type', () => {
            const unknownNode: Node = {
                id: 'unknown_node',
                type: 'unknownType',
                position: { x: 0, y: 0 },
                data: {},
            };
            const type = getPortTypeFromHandle('unknown_node', 'handle', [unknownNode]);
            expect(type).toBeNull();
        });

        it('should handle handle ID with multiple colons', () => {
            // Edge case: field ID might contain colons (sanitized form)
            const nodeWithColonField: Node = {
                id: 'ledger_test',
                type: 'ledgerSource',
                position: { x: 0, y: 0 },
                data: {
                    schemaSnapshot: [
                        { id: 'field:with:colons', name: 'test', type: 'text' },
                    ],
                },
            };
            const type = getPortTypeFromHandle(
                'ledger_test',
                'ledger_test:field:with:colons',
                [nodeWithColonField]
            );
            expect(type).toBe('text');
        });
    });

    describe('convenience functions', () => {
        it('getSourcePortType should work correctly', () => {
            const type = getSourcePortType('ledger_abc123', 'ledger_abc123:field_1', allNodes);
            expect(type).toBe('number');
        });

        it('getTargetPortType should work correctly', () => {
            const type = getTargetPortType('corr_abc123', 'inputA', allNodes);
            expect(type).toBe('number[]');
        });
    });
});
