import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { useNodeStore } from './useNodeStore';

// Mock db module (save_canvas, load_canvas, getProfileDb)
vi.mock('../lib/db', () => ({
    getProfileDb: vi.fn(() => ({})),
    save_canvas: vi.fn(),
    load_canvas: vi.fn(),
}));

// Mock auth store
const mockAuthState = { isUnlocked: true, encryptionKey: null as CryptoKey | null };
vi.mock('../features/auth/useAuthStore', () => ({
    useAuthStore: Object.assign(
        vi.fn((selector: any) => selector(mockAuthState)),
        { getState: () => mockAuthState }
    )
}));

// Mock error store to track dispatchError calls
const mockDispatchError = vi.fn();
vi.mock('./useErrorStore', () => ({
    useErrorStore: { getState: () => ({ dispatchError: mockDispatchError }) }
}));

import * as dbModule from '../lib/db';

describe('useNodeStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDispatchError.mockClear();
        useNodeStore.getState().clearProfileData();
        mockAuthState.isUnlocked = true;
        mockAuthState.encryptionKey = null;
    });

    describe('initial state', () => {
        it('has empty nodes, edges, default viewport, isLoading false, error null', () => {
            const state = useNodeStore.getState();
            expect(state.nodes).toEqual([]);
            expect(state.edges).toEqual([]);
            expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    describe('setNodes', () => {
        it('updates nodes in the store', () => {
            const nodes = [{ id: 'n1', position: { x: 10, y: 20 }, data: { label: 'Node 1' } } as any];
            useNodeStore.getState().setNodes(nodes);
            expect(useNodeStore.getState().nodes).toEqual(nodes);
        });
    });

    describe('setEdges', () => {
        it('updates edges in the store', () => {
            const edges = [{ id: 'e1', source: 'n1', target: 'n2' } as any];
            useNodeStore.getState().setEdges(edges);
            expect(useNodeStore.getState().edges).toEqual(edges);
        });
    });

    describe('setViewport', () => {
        it('updates viewport in the store', () => {
            useNodeStore.getState().setViewport({ x: 100, y: 200, zoom: 1.5 });
            expect(useNodeStore.getState().viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
        });
    });

    describe('updateNodeData', () => {
        it('merges data into the matching node', () => {
            useNodeStore.getState().setNodes([
                { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Old' } } as any,
                { id: 'n2', position: { x: 0, y: 0 }, data: { label: 'Other' } } as any,
            ]);
            useNodeStore.getState().updateNodeData('n1', { label: 'new' });
            expect(useNodeStore.getState().nodes[0].data.label).toBe('new');
            // Other node unchanged
            expect(useNodeStore.getState().nodes[1].data.label).toBe('Other');
        });
    });

    describe('clearProfileData', () => {
        it('resets all state back to initial values', () => {
            useNodeStore.getState().setNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'X' } } as any]);
            useNodeStore.getState().setEdges([{ id: 'e1', source: 'n1', target: 'n2' } as any]);
            useNodeStore.getState().setViewport({ x: 50, y: 50, zoom: 2 });
            useNodeStore.setState({ isLoading: true, error: 'oops' });

            useNodeStore.getState().clearProfileData();

            const state = useNodeStore.getState();
            expect(state.nodes).toEqual([]);
            expect(state.edges).toEqual([]);
            expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    describe('loadCanvas', () => {
        it('sets nodes, edges, and viewport when load_canvas returns a canvas doc', async () => {
            const mockCanvas = {
                nodes: [{ id: 'n1', position: { x: 5, y: 5 }, data: { label: 'Loaded' } }],
                edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
                viewport: { x: 10, y: 20, zoom: 1.2 },
            };
            (dbModule.load_canvas as any).mockResolvedValueOnce(mockCanvas);

            await useNodeStore.getState().loadCanvas('profile-1', 'project-1', 'workflow-1');

            const state = useNodeStore.getState();
            expect(state.nodes).toEqual(mockCanvas.nodes);
            expect(state.edges).toEqual(mockCanvas.edges);
            expect(state.viewport).toEqual(mockCanvas.viewport);
            expect(state.isLoading).toBe(false);
        });

        it('falls back to empty defaults when load_canvas returns null', async () => {
            (dbModule.load_canvas as any).mockResolvedValueOnce(null);

            await useNodeStore.getState().loadCanvas('profile-1', 'project-1', 'workflow-1');

            const state = useNodeStore.getState();
            expect(state.nodes).toEqual([]);
            expect(state.edges).toEqual([]);
            expect(state.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
            expect(state.isLoading).toBe(false);
        });
    });

    describe('saveCanvas', () => {
        it('calls save_canvas with correct args when isUnlocked is true', async () => {
            mockAuthState.isUnlocked = true;
            const nodes = [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'X' } } as any];
            const edges = [{ id: 'e1', source: 'n1', target: 'n2' } as any];
            useNodeStore.getState().setNodes(nodes);
            useNodeStore.getState().setEdges(edges);
            useNodeStore.getState().setViewport({ x: 1, y: 2, zoom: 0.8 });

            await useNodeStore.getState().saveCanvas('profile-1', 'project-1', 'workflow-1');

            expect(dbModule.save_canvas).toHaveBeenCalledOnce();
            const [, canvasId, savedNodes, savedEdges, savedViewport, profileId] =
                (dbModule.save_canvas as any).mock.calls[0];
            expect(canvasId).toBe('workflow-1');
            expect(savedNodes).toEqual(nodes);
            expect(savedEdges).toEqual(edges);
            expect(savedViewport).toEqual({ x: 1, y: 2, zoom: 0.8 });
            expect(profileId).toBe('profile-1');
        });

        it('returns early without calling save_canvas when isUnlocked is false', async () => {
            mockAuthState.isUnlocked = false;

            await useNodeStore.getState().saveCanvas('profile-1', 'project-1', 'workflow-1');

            expect(dbModule.save_canvas).not.toHaveBeenCalled();
        });

        it('dispatches error when isUnlocked is false', async () => {
            mockAuthState.isUnlocked = false;

            await useNodeStore.getState().saveCanvas('profile-1', 'project-1', 'workflow-1');

            expect(mockDispatchError).toHaveBeenCalledWith('Cannot save canvas: vault is locked');
        });

        it('sets error state and dispatches error when saveCanvas fails', async () => {
            mockAuthState.isUnlocked = true;
            (dbModule.save_canvas as any).mockRejectedValueOnce(new Error('Save failed'));

            await useNodeStore.getState().saveCanvas('profile-1', 'project-1', 'workflow-1');

            expect(useNodeStore.getState().error).toBe('Save failed');
            expect(mockDispatchError).toHaveBeenCalledWith('Save failed');
        });
    });

    describe('onNodesChange', () => {
        it('applies node changes to store nodes', () => {
            const initialNodes = [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } } as any];
            useNodeStore.getState().setNodes(initialNodes);

            const positionChange = [{ type: 'position' as const, id: 'n1', position: { x: 100, y: 200 } }];
            useNodeStore.getState().onNodesChange(positionChange);

            const updatedNodes = useNodeStore.getState().nodes;
            expect(updatedNodes[0].position).toEqual({ x: 100, y: 200 });
        });

        it('removes nodes when delete change is applied', () => {
            const initialNodes = [
                { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } } as any,
                { id: 'n2', position: { x: 0, y: 0 }, data: { label: 'Node 2' } } as any,
            ];
            useNodeStore.getState().setNodes(initialNodes);

            const deleteChange = [{ type: 'remove' as const, id: 'n1' }];
            useNodeStore.getState().onNodesChange(deleteChange);

            const updatedNodes = useNodeStore.getState().nodes;
            expect(updatedNodes).toHaveLength(1);
            expect(updatedNodes[0].id).toBe('n2');
        });
    });

    describe('onEdgesChange', () => {
        it('applies edge changes to store edges', () => {
            const initialEdges = [{ id: 'e1', source: 'n1', target: 'n2' } as any];
            useNodeStore.getState().setEdges(initialEdges);

            const selectChange = [{ type: 'select' as const, id: 'e1', selected: true }];
            useNodeStore.getState().onEdgesChange(selectChange);

            const updatedEdges = useNodeStore.getState().edges;
            expect(updatedEdges[0].selected).toBe(true);
        });

        it('removes edges when delete change is applied', () => {
            const initialEdges = [
                { id: 'e1', source: 'n1', target: 'n2' } as any,
                { id: 'e2', source: 'n2', target: 'n3' } as any,
            ];
            useNodeStore.getState().setEdges(initialEdges);

            const deleteChange = [{ type: 'remove' as const, id: 'e1' }];
            useNodeStore.getState().onEdgesChange(deleteChange);

            const updatedEdges = useNodeStore.getState().edges;
            expect(updatedEdges).toHaveLength(1);
            expect(updatedEdges[0].id).toBe('e2');
        });
    });

    describe('onConnect', () => {
        it('adds a new edge to store edges', () => {
            useNodeStore.getState().setEdges([]);

            const connection = { source: 'n1', target: 'n2' } as any;
            useNodeStore.getState().onConnect(connection);

            const updatedEdges = useNodeStore.getState().edges;
            expect(updatedEdges).toHaveLength(1);
            expect(updatedEdges[0].source).toBe('n1');
            expect(updatedEdges[0].target).toBe('n2');
        });
    });
});
