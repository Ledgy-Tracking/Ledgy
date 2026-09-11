import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getSourceNodeOutput,
    updateTargetNodeInput,
    propagateNodeOutput,
    setupNodeDataChangeSubscription
} from '@/features/nodeEditor/utils/edgeDataFlow';
import { useNodeStore } from '../../../../stores/useNodeStore';

// Mock the node store
vi.mock('@/stores/useNodeStore', () => ({
    useNodeStore: {
        getState: vi.fn(),
        subscribe: vi.fn()
    }
}));

describe('edgeDataFlow', () => {
    const mockState = {
        nodes: [] as any[],
        edges: [] as any[],
        updateNodeData: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useNodeStore.getState as any).mockReturnValue(mockState);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getSourceNodeOutput', () => {
        it('should return entries for ledger source node', () => {
            const mockNode = {
                id: 'node1',
                type: 'ledgerSource',
                data: { entries: [{ id: 1, value: 10 }] }
            };

            mockState.nodes = [mockNode];

            const result = getSourceNodeOutput('node1');
            expect(result).toEqual([{ id: 1, value: 10 }]);
        });

        it('should return empty array for ledger source node with no entries', () => {
            const mockNode = {
                id: 'node1',
                type: 'ledgerSource',
                data: {}
            };

            mockState.nodes = [mockNode];

            const result = getSourceNodeOutput('node1');
            expect(result).toEqual([]);
        });

        it('should return output for correlation node', () => {
            const mockNode = {
                id: 'node1',
                type: 'correlation',
                data: { output: 0.85 }
            };

            mockState.nodes = [mockNode];

            const result = getSourceNodeOutput('node1');
            expect(result).toBe(0.85);
        });

        it('should return output for arithmetic node', () => {
            const mockNode = {
                id: 'node1',
                type: 'arithmetic',
                data: { output: 42 }
            };

            mockState.nodes = [mockNode];

            const result = getSourceNodeOutput('node1');
            expect(result).toBe(42);
        });

        it('should return null for unknown node type', () => {
            const mockNode = {
                id: 'node1',
                type: 'unknown',
                data: {}
            };

            mockState.nodes = [mockNode];

            const result = getSourceNodeOutput('node1');
            expect(result).toBeNull();
        });

        it('should return null for non-existent node', () => {
            mockState.nodes = [];

            const result = getSourceNodeOutput('node1');
            expect(result).toBeNull();
        });
    });

    describe('updateTargetNodeInput', () => {
        it('should update correlation node inputA with array data', () => {
            const mockNode = {
                id: 'node1',
                type: 'correlation',
                data: {}
            };

            mockState.nodes = [mockNode];

            updateTargetNodeInput('node1', 'inputA', [1, 2, 3]);

            expect(mockState.updateNodeData).toHaveBeenCalledWith('node1', {
                inputA: [1, 2, 3]
            });
        });

        it('should update correlation node inputB with array data', () => {
            const mockNode = {
                id: 'node1',
                type: 'correlation',
                data: {}
            };

            mockState.nodes = [mockNode];

            updateTargetNodeInput('node1', 'inputB', [4, 5, 6]);

            expect(mockState.updateNodeData).toHaveBeenCalledWith('node1', {
                inputB: [4, 5, 6]
            });
        });

        it('should convert single number to array for correlation node', () => {
            const mockNode = {
                id: 'node1',
                type: 'correlation',
                data: {}
            };

            mockState.nodes = [mockNode];

            updateTargetNodeInput('node1', 'inputA', 42);

            expect(mockState.updateNodeData).toHaveBeenCalledWith('node1', {
                inputA: [42]
            });
        });

        it('should update arithmetic node inputs with array data', () => {
            const mockNode = {
                id: 'node1',
                type: 'arithmetic',
                data: {}
            };

            mockState.nodes = [mockNode];

            updateTargetNodeInput('node1', 'input', [10, 20, 30]);

            expect(mockState.updateNodeData).toHaveBeenCalledWith('node1', {
                inputs: [10, 20, 30]
            });
        });

        it('should convert single number to array for arithmetic node', () => {
            const mockNode = {
                id: 'node1',
                type: 'arithmetic',
                data: {}
            };

            mockState.nodes = [mockNode];

            updateTargetNodeInput('node1', 'input', 99);

            expect(mockState.updateNodeData).toHaveBeenCalledWith('node1', {
                inputs: [99]
            });
        });

        it('should handle unknown input key for correlation node', () => {
            const mockNode = {
                id: 'node1',
                type: 'correlation',
                data: {}
            };

            mockState.nodes = [mockNode];
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            updateTargetNodeInput('node1', 'unknownInput', [1, 2, 3]);

            expect(mockState.updateNodeData).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Unknown input key for correlation node: unknownInput');

            consoleSpy.mockRestore();
        });

        it('should handle invalid data type for correlation node', () => {
            const mockNode = {
                id: 'node1',
                type: 'correlation',
                data: {}
            };

            mockState.nodes = [mockNode];
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            updateTargetNodeInput('node1', 'inputA', 'invalid');

            expect(mockState.updateNodeData).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Invalid input data type for correlation node: string');

            consoleSpy.mockRestore();
        });

        it('should handle unknown node type', () => {
            const mockNode = {
                id: 'node1',
                type: 'unknown',
                data: {}
            };

            mockState.nodes = [mockNode];
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            updateTargetNodeInput('node1', 'input', [1, 2, 3]);

            expect(mockState.updateNodeData).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Unknown node type unknown for input update');

            consoleSpy.mockRestore();
        });

        it('should handle non-existent node', () => {
            mockState.nodes = [];
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            updateTargetNodeInput('node1', 'input', [1, 2, 3]);

            expect(mockState.updateNodeData).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Node node1 not found for input update');

            consoleSpy.mockRestore();
        });
    });

    describe('propagateNodeOutput', () => {
        it('should propagate data to connected target nodes', () => {
            const sourceNode = {
                id: 'source',
                type: 'ledgerSource',
                data: { entries: [1, 2, 3] }
            };

            const targetNode = {
                id: 'target',
                type: 'correlation',
                data: {}
            };

            const edge = {
                id: 'edge1',
                source: 'source',
                target: 'target',
                targetHandle: 'inputA'
            };

            mockState.nodes = [sourceNode, targetNode];
            mockState.edges = [edge];

            propagateNodeOutput('source');

            expect(mockState.updateNodeData).toHaveBeenCalledWith('target', {
                inputA: [1, 2, 3]
            });
        });

        it('should use provided output data instead of getting from node', () => {
            const sourceNode = {
                id: 'source',
                type: 'ledgerSource',
                data: { entries: [1, 2, 3] }
            };

            const targetNode = {
                id: 'target',
                type: 'correlation',
                data: {}
            };

            const edge = {
                id: 'edge1',
                source: 'source',
                target: 'target',
                targetHandle: 'inputA'
            };

            mockState.nodes = [sourceNode, targetNode];
            mockState.edges = [edge];

            propagateNodeOutput('source', [4, 5, 6]);

            expect(mockState.updateNodeData).toHaveBeenCalledWith('target', {
                inputA: [4, 5, 6]
            });
        });

        it('should handle multiple target nodes', () => {
            const sourceNode = {
                id: 'source',
                type: 'ledgerSource',
                data: { entries: [1, 2, 3] }
            };

            const targetNode1 = {
                id: 'target1',
                type: 'correlation',
                data: {}
            };

            const targetNode2 = {
                id: 'target2',
                type: 'arithmetic',
                data: {}
            };

            const edge1 = {
                id: 'edge1',
                source: 'source',
                target: 'target1',
                targetHandle: 'inputA'
            };

            const edge2 = {
                id: 'edge2',
                source: 'source',
                target: 'target2',
                targetHandle: 'input'
            };

            mockState.nodes = [sourceNode, targetNode1, targetNode2];
            mockState.edges = [edge1, edge2];

            propagateNodeOutput('source');

            expect(mockState.updateNodeData).toHaveBeenCalledWith('target1', {
                inputA: [1, 2, 3]
            });

            expect(mockState.updateNodeData).toHaveBeenCalledWith('target2', {
                inputs: [1, 2, 3]
            });
        });

        it('should do nothing if node has no outgoing edges', () => {
            const sourceNode = {
                id: 'source',
                type: 'ledgerSource',
                data: { entries: [1, 2, 3] }
            };

            mockState.nodes = [sourceNode];
            mockState.edges = [];

            propagateNodeOutput('source');

            expect(mockState.updateNodeData).not.toHaveBeenCalled();
        });

        it('should use default input key if targetHandle is not specified', () => {
            const sourceNode = {
                id: 'source',
                type: 'ledgerSource',
                data: { entries: [1, 2, 3] }
            };

            const targetNode = {
                id: 'target',
                type: 'correlation',
                data: {}
            };

            const edge = {
                id: 'edge1',
                source: 'source',
                target: 'target',
                targetHandle: undefined
            };

            mockState.nodes = [sourceNode, targetNode];
            mockState.edges = [edge];

            propagateNodeOutput('source');

            expect(mockState.updateNodeData).toHaveBeenCalledWith('target', {
                inputA: [1, 2, 3]
            });
        });

        it('should warn if no output data available', () => {
            const sourceNode = {
                id: 'source',
                type: 'unknown',
                data: {}
            };

            const targetNode = {
                id: 'target',
                type: 'correlation',
                data: {}
            };

            const edge = {
                id: 'edge1',
                source: 'source',
                target: 'target'
            };

            mockState.nodes = [sourceNode, targetNode];
            mockState.edges = [edge];

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            propagateNodeOutput('source');

            expect(consoleSpy).toHaveBeenCalledWith('No output data available from node source');
            expect(mockState.updateNodeData).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('setupNodeDataChangeSubscription', () => {
        it('should set up subscription and return unsubscribe function', () => {
            const mockUnsubscribe = vi.fn();
            (useNodeStore.subscribe as any).mockReturnValue(mockUnsubscribe);

            const unsubscribe = setupNodeDataChangeSubscription();

            expect(useNodeStore.subscribe).toHaveBeenCalledWith(
                expect.any(Function), // selector
                expect.any(Function), // listener
                { equalityFn: expect.any(Function) } // options
            );

            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should propagate changes when node data changes', () => {
            const mockUnsubscribe = vi.fn();
            (useNodeStore.subscribe as any).mockImplementation((_selector: any, listener: any) => {
                // Simulate calling the listener with changed nodes
                const currentNodes = [
                    { id: 'node1', type: 'ledgerSource', data: { entries: [1, 2, 3] } }
                ];
                const previousNodes = [
                    { id: 'node1', type: 'ledgerSource', data: { entries: [1, 2] } }
                ];

                // Call listener to simulate data change
                setTimeout(() => listener(currentNodes, previousNodes), 0);

                return mockUnsubscribe;
            });

            // Set up edges so propagation happens
            mockState.edges = [
                { id: 'edge1', source: 'node1', target: 'node2' }
            ];
            mockState.nodes = [
                { id: 'node1', type: 'ledgerSource', data: { entries: [1, 2, 3] } },
                { id: 'node2', type: 'correlation', data: {} }
            ];

            setupNodeDataChangeSubscription();

            // Wait for async execution
            setTimeout(() => {
                expect(mockState.updateNodeData).toHaveBeenCalledWith('node2', {
                    inputA: [1, 2, 3]
                });
            }, 10);
        });
    });
});