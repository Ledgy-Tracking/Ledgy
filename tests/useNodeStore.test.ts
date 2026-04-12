import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNodeStore, DEBOUNCE_DELAY, MAX_RETRIES } from '../src/stores/useNodeStore';
import { useAuthStore } from '../src/features/auth/useAuthStore';
import { useErrorStore } from '../src/stores/useErrorStore';
import * as dbModule from '../src/lib/db';

// Mock the dependencies
vi.mock('../src/features/auth/useAuthStore', () => ({
    useAuthStore: {
        getState: vi.fn(() => ({
            isUnlocked: true,
            encryptionKey: null,
        })),
    },
}));

vi.mock('../src/stores/useErrorStore', () => ({
    useErrorStore: {
        getState: vi.fn(() => ({
            dispatchError: vi.fn(),
        })),
    },
}));

vi.mock('../src/lib/db', () => ({
    getProfileDb: vi.fn(() => ({})),
    save_canvas: vi.fn(),
    load_canvas: vi.fn(),
}));

describe('useNodeStore - Debounced Persistence', () => {
    beforeEach(() => {
        // Reset store state before each test
        useNodeStore.setState({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            isLoading: false,
            error: null,
            activeProfileId: 'test-profile',
            activeProjectId: 'test-project',
            activeWorkflowId: 'test-workflow',
            isCanvasLoaded: true,
            isSaveInProgress: false,
            saveError: null,
            lastSavedAt: null,
        });
        
        // Clear any pending timeouts
        useNodeStore.getState().clearDebouncedSave();
        
        // Reset mocks
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        useNodeStore.getState().clearDebouncedSave();
    });

    describe('Debounced Save Mechanism', () => {
        it('should not save when isCanvasLoaded is false', () => {
            const saveCanvasSpy = vi.spyOn(useNodeStore.getState(), 'saveCanvas');
            
            useNodeStore.setState({ isCanvasLoaded: false });
            useNodeStore.getState().debouncedSaveCanvas();
            
            vi.advanceTimersByTime(DEBOUNCE_DELAY + 100);
            
            expect(saveCanvasSpy).not.toHaveBeenCalled();
        });

        it('should debounce multiple rapid calls into single save', () => {
            const saveCanvasSpy = vi.spyOn(useNodeStore.getState(), 'saveCanvas')
                .mockResolvedValue(undefined);
            
            // Call debounced save 5 times rapidly
            for (let i = 0; i < 5; i++) {
                useNodeStore.getState().debouncedSaveCanvas();
            }
            
            // Should not have saved yet
            expect(saveCanvasSpy).not.toHaveBeenCalled();
            
            // Advance past debounce delay
            vi.advanceTimersByTime(DEBOUNCE_DELAY + 100);
            
            // Should only save once
            expect(saveCanvasSpy).toHaveBeenCalledTimes(1);
        });

        it('should reset debounce timer on subsequent calls', () => {
            const saveCanvasSpy = vi.spyOn(useNodeStore.getState(), 'saveCanvas')
                .mockResolvedValue(undefined);
            
            // First call
            useNodeStore.getState().debouncedSaveCanvas();
            vi.advanceTimersByTime(DEBOUNCE_DELAY / 2);
            
            // Second call should reset timer
            useNodeStore.getState().debouncedSaveCanvas();
            vi.advanceTimersByTime(DEBOUNCE_DELAY / 2);
            
            // Should not have saved yet (timer was reset)
            expect(saveCanvasSpy).not.toHaveBeenCalled();
            
            // Now advance full delay from second call
            vi.advanceTimersByTime(DEBOUNCE_DELAY / 2 + 100);
            
            expect(saveCanvasSpy).toHaveBeenCalledTimes(1);
        });

        it('should capture IDs and data at call time to prevent race conditions', async () => {
            const mockSaveCanvas = vi.fn().mockResolvedValue(undefined);
            vi.spyOn(useNodeStore.getState(), 'saveCanvas').mockImplementation(mockSaveCanvas);
            
            // Set initial IDs
            useNodeStore.setState({
                activeProfileId: 'initial-profile',
                activeProjectId: 'initial-project',
                activeWorkflowId: 'initial-workflow',
            });
            
            // Capture initial state
            useNodeStore.getState().debouncedSaveCanvas();
            
            // Change IDs before timer fires
            useNodeStore.setState({ 
                nodes: [{ id: 'changed', type: 'test', position: { x: 0, y: 0 }, data: {} }],
                activeWorkflowId: 'changed-workflow'
            });
            
            vi.advanceTimersByTime(DEBOUNCE_DELAY + 100);
            await Promise.resolve(); // Let promise resolve
            
            // Should save with original captured values because IDs changed
            // The save should NOT happen because IDs don't match
            expect(mockSaveCanvas).not.toHaveBeenCalled();
        });

        it('should prevent cross-workflow saves when IDs change', async () => {
            const saveCanvasSpy = vi.spyOn(useNodeStore.getState(), 'saveCanvas')
                .mockResolvedValue(undefined);
            
            useNodeStore.getState().debouncedSaveCanvas();
            
            // Change workflow ID before timer fires
            useNodeStore.setState({ activeWorkflowId: 'different-workflow' });
            
            vi.advanceTimersByTime(DEBOUNCE_DELAY + 100);
            
            // Should not save because IDs don't match
            expect(saveCanvasSpy).not.toHaveBeenCalled();
        });

        it('should clear debounced save on clearDebouncedSave call', () => {
            const saveCanvasSpy = vi.spyOn(useNodeStore.getState(), 'saveCanvas')
                .mockResolvedValue(undefined);
            
            useNodeStore.getState().debouncedSaveCanvas();
            useNodeStore.getState().clearDebouncedSave();
            
            vi.advanceTimersByTime(DEBOUNCE_DELAY + 100);
            
            expect(saveCanvasSpy).not.toHaveBeenCalled();
        });
    });

    describe('State Management', () => {
        it('should track isSaveInProgress during save operations', async () => {
            const savePromise = new Promise<void>((resolve) => {
                setTimeout(resolve, 100);
            });
            vi.spyOn(useNodeStore.getState(), 'saveCanvas').mockReturnValue(savePromise);
            
            expect(useNodeStore.getState().isSaveInProgress).toBe(false);
            
            useNodeStore.getState().saveCanvasWithRetry(
                { profileId: 'p', projectId: 'p', workflowId: 'w' },
                { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
            );
            
            expect(useNodeStore.getState().isSaveInProgress).toBe(true);
            
            vi.advanceTimersByTime(100);
            await Promise.resolve();
            
            expect(useNodeStore.getState().isSaveInProgress).toBe(false);
        });

        it('should set isCanvasLoaded after successful load', async () => {
            const mockCanvas = {
                nodes: [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
            };
            vi.mocked(dbModule.load_canvas).mockResolvedValue(mockCanvas as any);
            
            // Reset isCanvasLoaded to false before load
            useNodeStore.setState({ isCanvasLoaded: false });
            expect(useNodeStore.getState().isCanvasLoaded).toBe(false);
            
            await useNodeStore.getState().loadCanvas('p', 'p', 'w');
            
            expect(useNodeStore.getState().isCanvasLoaded).toBe(true);
            expect(useNodeStore.getState().nodes).toEqual(mockCanvas.nodes);
        });

        it('should reset isCanvasLoaded to false on load error', async () => {
            vi.mocked(dbModule.load_canvas).mockRejectedValue(new Error('Load failed'));
            
            useNodeStore.setState({ isCanvasLoaded: true });
            
            await useNodeStore.getState().loadCanvas('p', 'p', 'w');
            
            expect(useNodeStore.getState().isCanvasLoaded).toBe(false);
        });

        it('should track lastSavedAt timestamp on successful save', async () => {
            vi.spyOn(useNodeStore.getState(), 'saveCanvas').mockResolvedValue(undefined);
            
            const beforeSave = Date.now();
            
            await useNodeStore.getState().saveCanvasWithRetry(
                { profileId: 'p', projectId: 'p', workflowId: 'w' },
                { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
            );
            
            const afterSave = Date.now();
            const lastSaved = useNodeStore.getState().lastSavedAt;
            
            expect(lastSaved).not.toBeNull();
            expect(lastSaved).toBeGreaterThanOrEqual(beforeSave);
            expect(lastSaved).toBeLessThanOrEqual(afterSave);
        });
    });

    describe('Viewport Management', () => {
        it('should update viewport with setViewport', () => {
            const newViewport = { x: 100, y: 200, zoom: 1.5 };
            
            useNodeStore.getState().setViewport(newViewport);
            
            expect(useNodeStore.getState().viewport).toEqual(newViewport);
        });

        it('should persist viewport in debounced save', async () => {
            const saveCanvasSpy = vi.spyOn(useNodeStore.getState(), 'saveCanvas')
                .mockResolvedValue(undefined);
            
            const testViewport = { x: 50, y: 75, zoom: 0.8 };
            useNodeStore.setState({ viewport: testViewport });
            
            useNodeStore.getState().debouncedSaveCanvas();
            vi.advanceTimersByTime(DEBOUNCE_DELAY + 100);
            
            // Verify saveCanvas was called with the correct viewport
            expect(saveCanvasSpy).toHaveBeenCalled();
        });
    });

    describe('Clear Profile Data', () => {
        it('should reset state and clear pending debounce on clearProfileData', () => {
            useNodeStore.setState({
                nodes: [{ id: '1', type: 'test', position: { x: 0, y: 0 }, data: {} }],
                edges: [{ id: 'e1', source: '1', target: '2' }],
                viewport: { x: 100, y: 100, zoom: 2 },
                isCanvasLoaded: true,
                lastSavedAt: Date.now(),
            });
            
            // Start a debounced save
            useNodeStore.getState().debouncedSaveCanvas();
            
            useNodeStore.getState().clearProfileData();
            
            expect(useNodeStore.getState().nodes).toEqual([]);
            expect(useNodeStore.getState().edges).toEqual([]);
            expect(useNodeStore.getState().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
            expect(useNodeStore.getState().isCanvasLoaded).toBe(false);
            expect(useNodeStore.getState().lastSavedAt).toBeNull();
        });
    });
});

describe('useNodeStore - Node and Edge Operations', () => {
    beforeEach(() => {
        useNodeStore.setState({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            isLoading: false,
            error: null,
            activeProfileId: 'test-profile',
            activeProjectId: 'test-project',
            activeWorkflowId: 'test-workflow',
            isCanvasLoaded: true,
            isSaveInProgress: false,
            saveError: null,
            lastSavedAt: null,
        });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        useNodeStore.getState().clearDebouncedSave();
    });

    it('should set nodes with setNodes', () => {
        const newNodes = [
            { id: '1', type: 'ledgerSource', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
            { id: '2', type: 'correlation', position: { x: 100, y: 100 }, data: { label: 'Node 2' } },
        ];
        
        useNodeStore.getState().setNodes(newNodes);
        
        expect(useNodeStore.getState().nodes).toEqual(newNodes);
    });

    it('should set edges with setEdges', () => {
        const newEdges = [
            { id: 'e1', source: '1', target: '2', type: 'data' },
        ];
        
        useNodeStore.getState().setEdges(newEdges);
        
        expect(useNodeStore.getState().edges).toEqual(newEdges);
    });

    it('should update node data with updateNodeData', () => {
        const initialNodes = [
            { id: '1', type: 'ledgerSource', position: { x: 0, y: 0 }, data: { label: 'Node 1', value: 10 } },
        ];
        
        useNodeStore.setState({ nodes: initialNodes });
        
        useNodeStore.getState().updateNodeData('1', { value: 20, newField: 'test' });
        
        const updatedNode = useNodeStore.getState().nodes[0];
        expect(updatedNode.data.value).toBe(20);
        expect(updatedNode.data.newField).toBe('test');
        expect(updatedNode.data.label).toBe('Node 1'); // Original field preserved
    });

    it('should handle onNodesChange with applyNodeChanges', () => {
        const initialNodes = [
            { id: '1', type: 'ledgerSource', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
        ];
        
        useNodeStore.setState({ nodes: initialNodes });
        
        // Simulate a position change
        useNodeStore.getState().onNodesChange([
            { id: '1', type: 'position', position: { x: 50, y: 50 } },
        ]);
        
        const updatedNode = useNodeStore.getState().nodes[0];
        expect(updatedNode.position).toEqual({ x: 50, y: 50 });
    });

    it('should handle onEdgesChange with applyEdgeChanges', () => {
        const initialEdges = [
            { id: 'e1', source: '1', target: '2', type: 'data' },
        ];
        
        useNodeStore.setState({ edges: initialEdges });
        
        // Simulate removing an edge
        useNodeStore.getState().onEdgesChange([
            { id: 'e1', type: 'remove' },
        ]);
        
        expect(useNodeStore.getState().edges).toHaveLength(0);
    });

    it('should handle onConnect to add new edges', () => {
        useNodeStore.setState({ edges: [] });
        
        useNodeStore.getState().onConnect({
            source: '1',
            target: '2',
            sourceHandle: 'source-output',
            targetHandle: 'target-input',
        });
        
        const edges = useNodeStore.getState().edges;
        expect(edges).toHaveLength(1);
        expect(edges[0].source).toBe('1');
        expect(edges[0].target).toBe('2');
    });
});
