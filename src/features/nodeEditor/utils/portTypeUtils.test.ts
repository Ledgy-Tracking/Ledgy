/**
 * Unit tests for port type utilities
 * Story 4-7: Complex Edge Connection Snapping (AC4)
 */

import { describe, it, expect } from 'vitest';
import {
    getPortTypeFromHandle,
    getSourcePortType,
    getTargetPortType,
    arePortTypesCompatible,
    getPortTypeDescription,
    portCompatibilityMatrix
} from './portTypeUtils';
import type { Node } from '@xyflow/react';
import type { CanvasNode } from '../../../types/nodeEditor';
import type { PortType } from '../types/connection';

describe('portTypeUtils', () => {
    describe('getPortTypeFromHandle', () => {
        const createMockNode = (id: string, type: string, data: Record<string, unknown> = {}): Node => ({
            id,
            type,
            position: { x: 0, y: 0 },
            data
        });

        it('should extract type from LedgerSource field handle', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'ledgerSource', {
                    schemaSnapshot: [
                        { id: 'field1', name: 'Price', type: 'number' },
                        { id: 'field2', name: 'Name', type: 'text' }
                    ]
                })
            ];

            const result = getPortTypeFromHandle('node1', 'node1:field1', nodes);
            expect(result).toBe('number');
        });

        it('should extract type using field name as fallback', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'ledgerSource', {
                    schemaSnapshot: [
                        { name: 'Description', type: 'text' }
                    ]
                })
            ];

            const result = getPortTypeFromHandle('node1', 'node1:Description', nodes);
            expect(result).toBe('text');
        });

        it('should return null for LedgerSource without schema', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'ledgerSource', {})
            ];

            const result = getPortTypeFromHandle('node1', 'node1:field1', nodes);
            expect(result).toBeNull();
        });

        it('should return number[] for correlation input handles', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'correlation', {})
            ];

            expect(getPortTypeFromHandle('node1', 'inputA', nodes)).toBe('number[]');
            expect(getPortTypeFromHandle('node1', 'inputB', nodes)).toBe('number[]');
        });

        it('should return number for correlation output handle', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'correlation', {})
            ];

            const result = getPortTypeFromHandle('node1', 'output', nodes);
            expect(result).toBe('number');
        });

        it('should return number for arithmetic input and output handles', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'arithmetic', {})
            ];

            expect(getPortTypeFromHandle('node1', 'input0', nodes)).toBe('number');
            expect(getPortTypeFromHandle('node1', 'input1', nodes)).toBe('number');
            expect(getPortTypeFromHandle('node1', 'output', nodes)).toBe('number');
        });

        it('should return any for trigger output', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'trigger', {})
            ];

            const result = getPortTypeFromHandle('node1', 'output', nodes);
            expect(result).toBe('any');
        });

        it('should return any for dashboardOutput inputs', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'dashboardOutput', {})
            ];

            const result = getPortTypeFromHandle('node1', 'input0', nodes);
            expect(result).toBe('any');
        });

        it('should return null for unknown node type', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'unknownType', {})
            ];

            const result = getPortTypeFromHandle('node1', 'handle1', nodes);
            expect(result).toBeNull();
        });

        it('should return null for non-existent node', () => {
            const nodes: Node[] = [];

            const result = getPortTypeFromHandle('node1', 'handle1', nodes);
            expect(result).toBeNull();
        });

        it('should normalize legacy format handle IDs', () => {
            const nodes: Node[] = [
                createMockNode('node1', 'unknown', {})
            ];

            expect(getPortTypeFromHandle('node1', 'type-number', nodes)).toBe('number');
            expect(getPortTypeFromHandle('node1', 'handle-text', nodes)).toBe('text');
        });
    });

    describe('getSourcePortType', () => {
        it('should return null for null handleId', () => {
            const nodes: Node[] = [];
            const result = getSourcePortType('node1', null, nodes);
            expect(result).toBeNull();
        });

        it('should return null for undefined handleId', () => {
            const nodes: Node[] = [];
            const result = getSourcePortType('node1', undefined, nodes);
            expect(result).toBeNull();
        });

        it('should extract type when handleId is provided', () => {
            const nodes: Node[] = [
                {
                    id: 'node1',
                    type: 'arithmetic',
                    position: { x: 0, y: 0 },
                    data: {}
                }
            ];

            const result = getSourcePortType('node1', 'output', nodes);
            expect(result).toBe('number');
        });
    });

    describe('getTargetPortType', () => {
        it('should mirror getSourcePortType behavior', () => {
            const nodes: Node[] = [
                {
                    id: 'node1',
                    type: 'correlation',
                    position: { x: 0, y: 0 },
                    data: {}
                }
            ];

            const result = getTargetPortType('node1', 'inputA', nodes);
            expect(result).toBe('number[]');
        });
    });

    describe('arePortTypesCompatible', () => {
        it('should return true for identical types', () => {
            expect(arePortTypesCompatible('number', 'number')).toBe(true);
            expect(arePortTypesCompatible('text', 'text')).toBe(true);
        });

        it('should return true when target is any', () => {
            expect(arePortTypesCompatible('number', 'any')).toBe(true);
            expect(arePortTypesCompatible('text', 'any')).toBe(true);
            expect(arePortTypesCompatible('date', 'any')).toBe(true);
        });

        it('should return false for incompatible types', () => {
            expect(arePortTypesCompatible('number', 'text')).toBe(false);
            expect(arePortTypesCompatible('text', 'number')).toBe(false);
            expect(arePortTypesCompatible('boolean', 'date')).toBe(false);
        });

        it('should return true for compatible types per matrix', () => {
            // number -> number[] is compatible
            expect(arePortTypesCompatible('number', 'number[]')).toBe(true);
        });

        it('should return true when either type is null', () => {
            expect(arePortTypesCompatible(null, 'number')).toBe(true);
            expect(arePortTypesCompatible('number', null)).toBe(true);
            expect(arePortTypesCompatible(null, null)).toBe(true);
        });
    });

    describe('portCompatibilityMatrix', () => {
        it('should have valid entries for all port types', () => {
            const allTypes: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation', 'any'];
            
            allTypes.forEach(type => {
                expect(portCompatibilityMatrix[type]).toBeDefined();
                expect(Array.isArray(portCompatibilityMatrix[type])).toBe(true);
            });
        });

        it('should include self in compatibility list', () => {
            expect(portCompatibilityMatrix['number']).toContain('number');
            expect(portCompatibilityMatrix['text']).toContain('text');
            expect(portCompatibilityMatrix['date']).toContain('date');
        });

        it('should have any accepting all types', () => {
            const allTypes: PortType[] = ['number', 'number[]', 'text', 'date', 'boolean', 'relation'];
            allTypes.forEach(type => {
                expect(portCompatibilityMatrix['any']).toContain(type);
            });
        });
    });

    describe('getPortTypeDescription', () => {
        it('should return correct descriptions for all types', () => {
            expect(getPortTypeDescription('number')).toBe('Number');
            expect(getPortTypeDescription('number[]')).toBe('Number Array');
            expect(getPortTypeDescription('text')).toBe('Text');
            expect(getPortTypeDescription('date')).toBe('Date');
            expect(getPortTypeDescription('boolean')).toBe('Boolean');
            expect(getPortTypeDescription('relation')).toBe('Relation');
            expect(getPortTypeDescription('any')).toBe('Any Type');
        });

        it('should return "Unknown" for null', () => {
            expect(getPortTypeDescription(null)).toBe('Unknown');
        });

        it('should return the type itself for unknown types', () => {
            expect(getPortTypeDescription('unknown' as PortType)).toBe('unknown');
        });
    });
});
