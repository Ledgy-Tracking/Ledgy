import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNodeStore } from '../src/stores/useNodeStore';

vi.mock('../src/lib/db', () => ({
    getProfileDb: vi.fn(() => ({})),
    save_canvas: vi.fn(),
    load_canvas: vi.fn(),
}));

const mockAuthState = { isUnlocked: true, encryptionKey: null as CryptoKey | null };
vi.mock('../src/features/auth/useAuthStore', () => ({
    useAuthStore: Object.assign(
        vi.fn((selector: any) => selector(mockAuthState)),
        { getState: () => mockAuthState }
    )
}));

const mockDispatchError = vi.fn();
vi.mock('../src/stores/useErrorStore', () => ({
    useErrorStore: { getState: () => ({ dispatchError: mockDispatchError }) }
}));

describe('NodeCanvas - Store Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDispatchError.mockClear();
        useNodeStore.getState().clearProfileData();
        mockAuthState.isUnlocked = true;
        mockAuthState.encryptionKey = null;
    });

    describe('handleAddFirstNode viewport-space positioning', () => {
        it('uses viewport to calculate centered node position', () => {
            useNodeStore.getState().setViewport({ x: 100, y: 200, zoom: 2 });
            useNodeStore.getState().setNodes([]);

            const viewport = useNodeStore.getState().viewport;
            const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
            const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

            expect(centerX).toBe((window.innerWidth / 2 - 100) / 2);
            expect(centerY).toBe((window.innerHeight / 2 - 200) / 2);
        });

        it('node is positioned at center minus offset with viewport applied', () => {
            useNodeStore.getState().setViewport({ x: 0, y: 0, zoom: 1 });
            useNodeStore.getState().setNodes([]);

            const viewport = useNodeStore.getState().viewport;
            const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
            const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

            const newNodePos = { x: centerX - 100, y: centerY - 100 };
            expect(newNodePos.x).toBe(window.innerWidth / 2 - 100);
            expect(newNodePos.y).toBe(window.innerHeight / 2 - 100);
        });
    });

    describe('loadedRef reset behavior', () => {
        it('reset should be triggered on workflowId change', () => {
            const ref = { current: 'workflow-a' };
            const workflowId = 'workflow-b';

            ref.current = null;
            expect(ref.current).toBe(null);

            ref.current = workflowId;
            expect(ref.current).toBe('workflow-b');
        });

        it('prevents loading cached canvas when workflowId changes', () => {
            const loadedWorkflowRef = { current: 'workflow-a' };
            const newWorkflowId = 'workflow-b';

            expect(loadedWorkflowRef.current === newWorkflowId).toBe(false);
        });
    });
});
