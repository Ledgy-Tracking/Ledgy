import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNodeStore } from './useNodeStore';
import { useErrorStore } from '../../stores/useErrorStore';

describe('useNodeStore', () => {
    beforeEach(() => {
        useErrorStore.getState().clearError();
        useNodeStore.getState().clearProfileData();
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initializes with correct default state', () => {
        const state = useNodeStore.getState();
        expect(state.nodes).toEqual([]);
        expect(state.edges).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('adds node to graph', async () => {
        await useNodeStore.getState().addNode({
            id: 'node-1',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: 'Test Node', type: 'source' },
        });

        const state = useNodeStore.getState();
        expect(state.nodes).toHaveLength(1);
        expect(state.nodes[0].id).toBe('node-1');
    });

    it('updates node position', async () => {
        await useNodeStore.getState().addNode({
            id: 'node-1',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: 'Test', type: 'source' },
        });

        await useNodeStore.getState().updateNodePosition('node-1', 100, 200);
        const state = useNodeStore.getState();
        expect(state.nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('adds edge between nodes', async () => {
        await useNodeStore.getState().addNode({
            id: 'node-1',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: 'Source', type: 'source' },
        });
        await useNodeStore.getState().addNode({
            id: 'node-2',
            type: 'default',
            position: { x: 200, y: 0 },
            data: { label: 'Target', type: 'correlation' },
        });

        await useNodeStore.getState().addEdge({
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
        });

        const state = useNodeStore.getState();
        expect(state.edges).toHaveLength(1);
        expect(state.edges[0].source).toBe('node-1');
        expect(state.edges[0].target).toBe('node-2');
    });

    it('deletes node and connected edges', async () => {
        await useNodeStore.getState().addNode({
            id: 'node-1',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: 'Source', type: 'source' },
        });
        await useNodeStore.getState().addNode({
            id: 'node-2',
            type: 'default',
            position: { x: 200, y: 0 },
            data: { label: 'Target', type: 'correlation' },
        });
        await useNodeStore.getState().addEdge({
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
        });

        await useNodeStore.getState().deleteNode('node-1');
        // Let debounce settle
        vi.runAllTimers();

        const state = useNodeStore.getState();
        console.log(state.nodes);
        expect(state.nodes).toHaveLength(1);
        expect(state.nodes[0].id).toBe('node-2');
        expect(state.edges).toHaveLength(0);
    });

    it('deletes edge', async () => {
        await useNodeStore.getState().addEdge({
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
        });

        await useNodeStore.getState().deleteEdge('edge-1');
        const state = useNodeStore.getState();
        expect(state.edges).toHaveLength(0);
    });

    it('saves graph to localStorage', async () => {
        await useNodeStore.getState().addNode({
            id: 'node-1',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: 'Test', type: 'source' },
        });

        await useNodeStore.getState().saveGraph();
        const stored = localStorage.getItem('ledgy-nodes');
        expect(stored).toBeTruthy();
    });

    it('loads graph from localStorage', async () => {
        const testNodes = [{
            id: 'node-1',
            type: 'default' as const,
            position: { x: 0, y: 0 },
            data: { label: 'Test', type: 'source' as const },
        }];
        localStorage.setItem('ledgy-nodes', JSON.stringify(testNodes));
        localStorage.setItem('ledgy-edges', JSON.stringify([]));

        await useNodeStore.getState().loadGraph();
        const state = useNodeStore.getState();
        expect(state.nodes).toHaveLength(1);
        expect(state.nodes[0].id).toBe('node-1');
    });

    it('debounces save on position update', async () => {
        await useNodeStore.getState().addNode({
            id: 'node-1',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: 'Test', type: 'source' },
        });

        // Trigger position update (should debounce)
        useNodeStore.getState().updateNodePosition('node-1', 100, 200);

        // Check that save hasn't happened yet
        expect(localStorage.getItem('ledgy-nodes')).toBeNull();

        // Fast-forward timers
        vi.advanceTimersByTime(1000);

        // Now save should have happened
        expect(localStorage.getItem('ledgy-nodes')).toBeTruthy();
    });
});
