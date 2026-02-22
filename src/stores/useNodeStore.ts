import { create } from 'zustand';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { CanvasNode, CanvasEdge, Viewport } from '../types/nodeEditor';
import { save_canvas, load_canvas } from '../lib/db';

interface NodeState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadCanvas: (profileId: string, canvasId?: string) => Promise<void>;
    saveCanvas: (profileId: string, canvasId?: string) => Promise<void>;
    setNodes: (nodes: CanvasNode[]) => void;
    setEdges: (edges: CanvasEdge[]) => void;
    setViewport: (viewport: Viewport) => void;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const useNodeStore = create<NodeState>((set, get) => ({
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
    isLoading: false,
    error: null,

    loadCanvas: async (profileId: string, canvasId = 'default') => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to load canvas.');
            }

            const db = getProfileDb(profileId);
            const canvas = await load_canvas(db, canvasId);

            if (canvas) {
                set({
                    nodes: canvas.nodes || [],
                    edges: canvas.edges || [],
                    viewport: canvas.viewport || DEFAULT_VIEWPORT,
                    isLoading: false,
                });
            } else {
                // Empty canvas
                set({
                    nodes: [],
                    edges: [],
                    viewport: DEFAULT_VIEWPORT,
                    isLoading: false,
                });
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to load canvas';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    saveCanvas: async (profileId: string, canvasId = 'default') => {
        set({ isLoading: true, error: null });
        try {
            const authState = useAuthStore.getState();
            if (!authState.isUnlocked) {
                throw new Error('Vault must be unlocked to save canvas.');
            }

            const { nodes, edges, viewport } = get();
            const db = getProfileDb(profileId);
            await save_canvas(db, canvasId, nodes, edges, viewport, profileId);
            set({ isLoading: false });
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to save canvas';
            set({ error: errorMsg, isLoading: false });
            useErrorStore.getState().dispatchError(errorMsg);
        }
    },

    setNodes: (nodes: CanvasNode[]) => {
        set({ nodes });
    },

    setEdges: (edges: CanvasEdge[]) => {
        set({ edges });
    },

    setViewport: (viewport: Viewport) => {
        set({ viewport });
    },
}));
