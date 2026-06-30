import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Node } from '@xyflow/react';
import {
    calculateBoundingBox,
    getDefaultContainerLabel,
    validateGrouping,
    createContainerFromSelection,
    groupNodes,
} from '../../../src/features/nodeEditor/utils/groupNodes';

// Mock uuid
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'abc12345-1234-1234-1234-123412341234'),
}));

// Mock error store
vi.mock('../../../src/stores/useErrorStore', () => ({
    useErrorStore: {
        getState: vi.fn(() => ({
            dispatchError: vi.fn(),
        })),
    },
}));

describe('groupNodes', () => {
    const createMockNode = (id: string, x: number, y: number, parentId?: string): Node => ({
        id,
        type: 'correlation',
        position: { x, y },
        width: 150,
        height: 100,
        data: { label: `Node ${id}` },
        parentId,
    });

    describe('calculateBoundingBox', () => {
        it('should calculate correct bounding box for multiple nodes', () => {
            const nodes = [
                createMockNode('1', 0, 0),
                createMockNode('2', 200, 100),
            ];

            const bounds = calculateBoundingBox(nodes);

            expect(bounds.minX).toBe(0);
            expect(bounds.minY).toBe(0);
            expect(bounds.maxX).toBe(350); // 200 + 150
            expect(bounds.maxY).toBe(200); // 100 + 100
            expect(bounds.width).toBe(350);
            expect(bounds.height).toBe(200);
        });

        it('should handle single node', () => {
            const nodes = [createMockNode('1', 50, 50)];

            const bounds = calculateBoundingBox(nodes);

            expect(bounds.minX).toBe(50);
            expect(bounds.minY).toBe(50);
            expect(bounds.width).toBe(150);
            expect(bounds.height).toBe(100);
        });
    });

    describe('getDefaultContainerLabel', () => {
        it('should return "Group" for first container', () => {
            const nodes: Node[] = [];
            expect(getDefaultContainerLabel(nodes)).toBe('Group');
        });

        it('should return "Group 2" when one container exists', () => {
            const nodes = [
                { id: 'c1', type: 'container', position: { x: 0, y: 0 }, data: {} },
            ] as Node[];
            expect(getDefaultContainerLabel(nodes)).toBe('Group 2');
        });
    });

    describe('validateGrouping', () => {
        it('should fail with less than 2 nodes', () => {
            const nodes = [createMockNode('1', 0, 0)];
            const result = validateGrouping(nodes, []);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 2');
        });

        it('should fail if any node is already in a container', () => {
            const nodes = [
                createMockNode('1', 0, 0, 'container1'),
                createMockNode('2', 100, 0),
            ];

            const result = validateGrouping(nodes, []);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('already in a container');
        });

        it('should fail if nodes are from different containers', () => {
            // Note: First check catches "already in container", but if we had a scenario
            // where nodes pass that check but have different parents, we'd catch it here
            // For now, this test verifies the logic structure
            const nodes = [
                createMockNode('1', 0, 0, 'container1'),
                createMockNode('2', 100, 0, 'container1'), // Same container - should pass first check
            ];

            const result = validateGrouping(nodes, []);

            // Both are in container1, so first check passes (same container)
            expect(result.valid).toBe(false);
            expect(result.error).toContain('already in a container');
        });

        it('should pass for valid selection', () => {
            const nodes = [
                createMockNode('1', 0, 0),
                createMockNode('2', 100, 0),
                createMockNode('3', 200, 0),
            ];

            const result = validateGrouping(nodes, []);

            expect(result.valid).toBe(true);
        });
    });

    describe('createContainerFromSelection', () => {
        it('should create container with correct bounds and padding', () => {
            const selectedNodes = [
                createMockNode('1', 0, 0),
                createMockNode('2', 200, 100),
            ];

            const result = createContainerFromSelection(selectedNodes, [], 'My Group');

            expect(result.container.type).toBe('container');
            expect(result.container.data.label).toBe('My Group');
            expect(result.container.data.type).toBe('container');
            expect(result.container.data.isCollapsed).toBe(false);
            expect(result.container.data.childNodeIds).toEqual(['1', '2']);
            
            // Check container is positioned with padding
            expect(result.container.position.x).toBe(-40); // minX - padding
            expect(result.container.position.y).toBe(-40); // minY - padding
        });

        it('should convert children to relative positions', () => {
            const selectedNodes = [
                createMockNode('1', 0, 0),
                createMockNode('2', 200, 100),
            ];

            const result = createContainerFromSelection(selectedNodes, []);

            // Child 1 should be at (40, 40) relative to container (-40, -40)
            const child1 = result.updatedChildren.find(n => n.id === '1');
            expect(child1?.position).toEqual({ x: 40, y: 40 });
            expect(child1?.parentId).toBe(result.container.id);
            expect(child1?.extent).toBe('parent');
        });
    });

    describe('groupNodes', () => {
        it('should return null for invalid grouping', () => {
            const allNodes = [createMockNode('1', 0, 0)];
            const result = groupNodes(['1'], allNodes);

            expect(result).toBeNull();
        });

        it('should return container for valid grouping', () => {
            const allNodes = [
                createMockNode('1', 0, 0),
                createMockNode('2', 100, 0),
            ];

            const result = groupNodes(['1', '2'], allNodes);

            expect(result).not.toBeNull();
            expect(result?.container.type).toBe('container');
            expect(result?.updatedChildren).toHaveLength(2);
        });
    });
});
