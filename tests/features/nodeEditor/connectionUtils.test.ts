import { describe, it, expect } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import {
    isInternalConnection,
    isExternalConnection,
    getInternalConnections,
    getExternalConnections,
    getContainerChain,
    wouldCreateCircularReference,
} from '../../../src/features/nodeEditor/utils/connectionUtils';

describe('connectionUtils', () => {
    const createMockNode = (id: string, parentId?: string): Node => ({
        id,
        type: 'correlation',
        position: { x: 0, y: 0 },
        data: { label: id },
        parentId,
    });

    const createMockContainer = (id: string, childIds: string[]): Node => ({
        id,
        type: 'container',
        position: { x: 0, y: 0 },
        data: {
            type: 'container',
            label: 'Group',
            isCollapsed: false,
            childNodeIds: childIds,
            createdAt: new Date().toISOString(),
        },
    });

    const createMockEdge = (source: string, target: string): Edge => ({
        id: `e-${source}-${target}`,
        source,
        target,
    });

    describe('isInternalConnection', () => {
        it('should return true for edge between two children', () => {
            const nodes = [
                createMockContainer('c1', ['1', '2']),
                createMockNode('1', 'c1'),
                createMockNode('2', 'c1'),
            ];
            const edge = createMockEdge('1', '2');

            expect(isInternalConnection(edge, 'c1', nodes)).toBe(true);
        });

        it('should return false for edge to outside node', () => {
            const nodes = [
                createMockContainer('c1', ['1']),
                createMockNode('1', 'c1'),
                createMockNode('2'),
            ];
            const edge = createMockEdge('1', '2');

            expect(isInternalConnection(edge, 'c1', nodes)).toBe(false);
        });

        it('should use parentId fallback when childNodeIds is missing', () => {
            const nodes = [
                createMockNode('1', 'c1'),
                createMockNode('2', 'c1'),
            ];
            const edge = createMockEdge('1', '2');

            expect(isInternalConnection(edge, 'c1', nodes)).toBe(true);
        });
    });

    describe('isExternalConnection', () => {
        it('should return true for edge from container child to outside', () => {
            const nodes = [
                createMockContainer('c1', ['1']),
                createMockNode('1', 'c1'),
                createMockNode('2'),
            ];
            const edge = createMockEdge('1', '2');

            expect(isExternalConnection(edge, 'c1', nodes)).toBe(true);
        });

        it('should return true for edge from outside to container child', () => {
            const nodes = [
                createMockNode('1'),
                createMockContainer('c1', ['2']),
                createMockNode('2', 'c1'),
            ];
            const edge = createMockEdge('1', '2');

            expect(isExternalConnection(edge, 'c1', nodes)).toBe(true);
        });

        it('should return false for internal edge', () => {
            const nodes = [
                createMockContainer('c1', ['1', '2']),
                createMockNode('1', 'c1'),
                createMockNode('2', 'c1'),
            ];
            const edge = createMockEdge('1', '2');

            expect(isExternalConnection(edge, 'c1', nodes)).toBe(false);
        });
    });

    describe('getInternalConnections', () => {
        it('should return only internal edges', () => {
            const nodes = [
                createMockContainer('c1', ['1', '2']),
                createMockNode('1', 'c1'),
                createMockNode('2', 'c1'),
                createMockNode('3'),
            ];
            const edges = [
                createMockEdge('1', '2'), // Internal
                createMockEdge('1', '3'), // External
            ];

            const internal = getInternalConnections('c1', edges, nodes);

            expect(internal).toHaveLength(1);
            expect(internal[0].id).toBe('e-1-2');
        });
    });

    describe('getExternalConnections', () => {
        it('should return only external edges', () => {
            const nodes = [
                createMockContainer('c1', ['1']),
                createMockNode('1', 'c1'),
                createMockNode('2'),
            ];
            const edges = [
                createMockEdge('1', '2'), // External
            ];

            const external = getExternalConnections('c1', edges, nodes);

            expect(external).toHaveLength(1);
            expect(external[0].id).toBe('e-1-2');
        });
    });

    describe('getContainerChain', () => {
        it('should return chain of parent containers', () => {
            const nodes = [
                createMockNode('1', 'c1'),
                createMockNode('c1', 'c2'),
                createMockNode('c2'),
            ];

            const chain = getContainerChain('1', nodes);

            expect(chain).toEqual(['c1', 'c2']);
        });

        it('should return empty array for node with no parent', () => {
            const nodes = [createMockNode('1')];

            const chain = getContainerChain('1', nodes);

            expect(chain).toEqual([]);
        });
    });

    describe('wouldCreateCircularReference', () => {
        it('should return true if potential parent is descendant of container', () => {
            // Scenario: c1 is parent of c2, trying to make c2 parent of c1 (circular!)
            const nodes = [
                createMockNode('c1'),
                createMockNode('c2', 'c1'),
            ];

            // Trying to add c1 as child of c2 - c1 is already an ancestor of c2
            expect(wouldCreateCircularReference('c1', 'c2', nodes)).toBe(true);
        });

        it('should return false if no circular reference', () => {
            const nodes = [
                createMockNode('c1'),
                createMockNode('c2'),
            ];

            expect(wouldCreateCircularReference('c2', 'c1', nodes)).toBe(false);
        });

        it('should return false when adding unrelated container as parent', () => {
            const nodes = [
                createMockNode('c1'),
                createMockNode('c2', 'c1'),
                createMockNode('c3'),
            ];

            // c3 is not related to c1/c2 hierarchy, so no circular ref
            expect(wouldCreateCircularReference('c3', 'c1', nodes)).toBe(false);
        });
    });
});
