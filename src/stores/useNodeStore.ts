import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    Edge,
    Node,
} from '@xyflow/react';
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
    activeProfileId: string | null;
    activeProjectId: string | null;

    // React Flow handlers (per official docs pattern)
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;

    // Actions
    loadCanvas: (profileId: string, projectId: string) => Promise<void>;
    saveCanvas: (profileId: string, projectId: string, nodes?: CanvasNode[], edges?: CanvasEdge[]) => Promise<void>;
    setNodes: (nodes: CanvasNode[]) => void;
    setEdges: (edges: CanvasEdge[]) => void;
    setViewport: (viewport: Viewport) => void;
    updateNodeData: (nodeId: string, data: Record<string, any>) => void;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const useNodeStore = create<NodeState>()(
    subscribeWithSelector((set, get) => ({
        nodes: [],
        edges: [],
        viewport: DEFAULT_VIEWPORT,
        isLoading: false,
        error: null,
        activeProfileId: null,
        activeProjectId: null,

        // Official React Flow + Zustand pattern:
        // applyNodeChanges handles internal RF changes (drag, select, resize)
        // These do NOT trigger computation - they're just position bookkeeping
        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes as Node[]) as CanvasNode[],
            });
        },

        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges as Edge[]) as CanvasEdge[],
            });
        },

        onConnect: (connection) => {
            set({
                edges: addEdge(connection, get().edges as Edge[]) as CanvasEdge[],
            });
        },

        loadCanvas: async (profileId: string, projectId: string) => {
            set({ isLoading: true, error: null, activeProfileId: profileId, activeProjectId: projectId });
            try {
                const authState = useAuthStore.getState();
                if (!authState.isUnlocked) throw new Error('Vault must be unlocked to load canvas.');

                const db = getProfileDb(profileId);
                const canvas = await load_canvas(db, projectId, authState.encryptionKey || undefined);

                if (canvas) {
                    set({
                        nodes: canvas.nodes || [],
                        edges: canvas.edges || [],
                        viewport: canvas.viewport || DEFAULT_VIEWPORT,
                        isLoading: false,
                    });
                } else {
                    set({ nodes: [], edges: [], viewport: DEFAULT_VIEWPORT, isLoading: false });
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to load canvas';
                set({ error: errorMsg, isLoading: false });
                useErrorStore.getState().dispatchError(errorMsg);
            }
        },

        saveCanvas: async (profileId: string, projectId: string, nodes?: CanvasNode[], edges?: CanvasEdge[]) => {
            try {
                const authState = useAuthStore.getState();
                if (!authState.isUnlocked) return;

                const state = get();
                const n = nodes ?? state.nodes;
                const e = edges ?? state.edges;
                const db = getProfileDb(profileId);
                await save_canvas(db, projectId, n, e, state.viewport, profileId, authState.encryptionKey || undefined);
            } catch (err: any) {
                useErrorStore.getState().dispatchError(err.message || 'Failed to save canvas');
            }
        },

        setNodes: (nodes: CanvasNode[]) => set({ nodes }),

        setEdges: (edges: CanvasEdge[]) => set({ edges }),

        setViewport: (viewport: Viewport) => set({ viewport }),

        /** Update specific fields in a node's data object.
         *  Uses getState() pattern so it can be called from non-reactive contexts. */
        updateNodeData: (nodeId: string, data: Record<string, any>) => {
            set({
                nodes: get().nodes.map(n =>
                    n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
                ),
            });
        },
    }))
);
