import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Mock error store to prevent side effects
vi.mock('./useErrorStore', () => ({
    useErrorStore: { getState: () => ({ dispatchError: vi.fn() }) }
}));

import * as dbModule from '../lib/db';

describe('useNodeStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
    });
});
