import { describe, it, expect } from 'vitest';
import { Node } from '@xyflow/react';
import {
    convertToAbsolutePositions,
    ungroupNodes,
    getContainerChildren,
} from '../../../src/features/nodeEditor/utils/ungroupNodes';

describe('ungroupNodes', () => {
    const createMockNode = (id: string, x: number, y: number, parentId?: string): Node => ({
        id,
        type: 'correlation',
        position: { x, y },
        width: 150,
        height: 100,
        data: { label: `Node ${id}` },
        parentId,
    });

    const createMockContainer = (id: string, x: number, y: number, childIds: string[]): Node => ({
        id,
        type: 'container',
        position: { x, y },
        style: { width: 400, height: 300 },
        data: {
            type: 'container',
            label: 'Test Group',
            isCollapsed: false,
            childNodeIds: childIds,
            createdAt: new Date().toISOString(),
        },
    });

    describe('convertToAbsolutePositions', () => {
        it('should convert relative positions to absolute', () => {
            const container = createMockContainer('c1', 100, 100, ['1', '2']);
            const children = [
                createMockNode('1', 20, 30, 'c1'),
                createMockNode('2', 50, 60, 'c1'),
            ];

            const result = convertToAbsolutePositions(container, children);

            expect(result[0].position).toEqual({ x: 120, y: 130 }); // 100+20, 100+30
            expect(result[1].position).toEqual({ x: 150, y: 160 }); // 100+50, 100+60
        });

        it('should remove parentId and extent from children', () => {
            const container = createMockContainer('c1', 0, 0, ['1']);
            const children = [createMockNode('1', 10, 10, 'c1')];

            const result = convertToAbsolutePositions(container, children);

            expect(result[0].parentId).toBeUndefined();
            expect(result[0].extent).toBeUndefined();
        });
    });

    describe('ungroupNodes', () => {
        it('should return null for non-existent container', () => {
            const allNodes: Node[] = [];
            const result = ungroupNodes('c1', allNodes);

            expect(result).toBeNull();
        });

        it('should return null for non-container node', () => {
            const allNodes = [createMockNode('1', 0, 0)];
            const result = ungroupNodes('1', allNodes);

            expect(result).toBeNull();
        });

        it('should ungroup container and restore children positions', () => {
            const allNodes = [
                createMockContainer('c1', 100, 100, ['1', '2']),
                createMockNode('1', 20, 30, 'c1'),
                createMockNode('2', 50, 60, 'c1'),
            ];

            const result = ungroupNodes('c1', allNodes);

            expect(result).not.toBeNull();
            expect(result?.restoredNodes).toHaveLength(2);
            expect(result?.childNodeIds).toEqual(['1', '2']);

            // Check positions are converted to absolute
            const child1 = result?.restoredNodes.find(n => n.id === '1');
            expect(child1?.position).toEqual({ x: 120, y: 130 });
            expect(child1?.parentId).toBeUndefined();
        });

        it('should handle container with no children', () => {
            const allNodes = [
                createMockContainer('c1', 100, 100, []),
            ];

            const result = ungroupNodes('c1', allNodes);

            expect(result).not.toBeNull();
            expect(result?.restoredNodes).toHaveLength(0);
        });

        it('should find children by parentId if childNodeIds is missing', () => {
            const allNodes = [
                {
                    id: 'c1',
                    type: 'container',
                    position: { x: 100, y: 100 },
                    data: { type: 'container', label: 'Group', isCollapsed: false, createdAt: '' },
                },
                createMockNode('1', 20, 30, 'c1'),
                createMockNode('2', 50, 60, 'c1'),
            ] as Node[];

            const result = ungroupNodes('c1', allNodes);

            expect(result).not.toBeNull();
            expect(result?.restoredNodes).toHaveLength(2);
        });
    });

    describe('getContainerChildren', () => {
        it('should return all children with matching parentId', () => {
            const allNodes = [
                createMockNode('1', 0, 0, 'c1'),
                createMockNode('2', 100, 0, 'c1'),
                createMockNode('3', 200, 0), // No parent
            ];

            const children = getContainerChildren('c1', allNodes);

            expect(children).toHaveLength(2);
            expect(children.map(n => n.id)).toEqual(['1', '2']);
        });

        it('should return empty array for container with no children', () => {
            const allNodes = [
                createMockNode('1', 0, 0),
                createMockNode('2', 100, 0),
            ];

            const children = getContainerChildren('c1', allNodes);

            expect(children).toHaveLength(0);
        });
    });
});
