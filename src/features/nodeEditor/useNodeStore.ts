import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface NodeData {
    label: string;
    type: 'source' | 'correlation' | 'arithmetic' | 'trigger';
    schemaType?: string;
    config?: Record<string, unknown>;
    [key: string]: unknown;
}

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge;

interface NodeState {
    // State fields
    nodes: FlowNode[];
    edges: FlowEdge[];
    isLoading: boolean;
    error: string | null;

    // Actions
    addNode: (node: FlowNode) => Promise<void>;
    updateNodePosition: (nodeId: string, x: number, y: number) => Promise<void>;
    addEdge: (edge: FlowEdge) => Promise<void>;
    deleteNode: (nodeId: string) => Promise<void>;
    deleteEdge: (edgeId: string) => Promise<void>;
    loadGraph: () => Promise<void>;
    saveGraph: () => Promise<void>;
    // Memory Sweep
    clearProfileData: () => void;
}

// Debounce helper for persistence
let saveTimeout: NodeJS.Timeout | null = null;

const debouncedSave = (saveFn: () => Promise<void>, delayMs: number = 1000) => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
        saveFn();
        saveTimeout = null;
    }, delayMs);
};

export const useNodeStore = create<NodeState>((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    isLoading: false,
    error: null,

    addNode: async (node: FlowNode) => {
        set({ isLoading: true, error: null });
        try {
            const updatedNodes = [...get().nodes, node];
            set({ nodes: updatedNodes, isLoading: false });

            // Debounced persistence
            debouncedSave(() => get().saveGraph());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add node';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    updateNodePosition: async (nodeId: string, x: number, y: number) => {
        try {
            const updatedNodes = get().nodes.map(node =>
                node.id === nodeId
                    ? { ...node, position: { x, y } }
                    : node
            );
            set({ nodes: updatedNodes });

            // Debounced persistence after drag
            debouncedSave(() => get().saveGraph());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update node position';
            set({ error: errorMessage });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    addEdge: async (edge: FlowEdge) => {
        set({ isLoading: true, error: null });
        try {
            const updatedEdges = [...get().edges, edge];
            set({ edges: updatedEdges, isLoading: false });

            // Debounced persistence
            debouncedSave(() => get().saveGraph());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add edge';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    deleteNode: async (nodeId: string) => {
        set({ isLoading: true, error: null });
        try {
            const updatedNodes = get().nodes.filter(node => node.id !== nodeId);
            const updatedEdges = get().edges.filter(edge =>
                edge.source !== nodeId && edge.target !== nodeId
            );
            set({ nodes: updatedNodes, edges: updatedEdges, isLoading: false });

            // Debounced persistence
            debouncedSave(() => get().saveGraph());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete node';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    deleteEdge: async (edgeId: string) => {
        set({ isLoading: true, error: null });
        try {
            const updatedEdges = get().edges.filter(edge => edge.id !== edgeId);
            set({ edges: updatedEdges, isLoading: false });

            // Debounced persistence
            debouncedSave(() => get().saveGraph());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete edge';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    loadGraph: async () => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const storedNodes = localStorage.getItem('ledgy-nodes');
            const storedEdges = localStorage.getItem('ledgy-edges');

            const nodes: FlowNode[] = storedNodes ? JSON.parse(storedNodes) : [];
            const edges: FlowEdge[] = storedEdges ? JSON.parse(storedEdges) : [];

            set({ nodes, edges, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load graph';
            set({ error: errorMessage, isLoading: false });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    saveGraph: async () => {
        try {
            // TODO: Implement PouchDB integration in Story 1.5
            // For now, mock implementation
            const { nodes, edges } = get();
            localStorage.setItem('ledgy-nodes', JSON.stringify(nodes));
            localStorage.setItem('ledgy-edges', JSON.stringify(edges));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save graph';
            set({ error: errorMessage });
            import('../../stores/useErrorStore').then(({ useErrorStore }) => {
                useErrorStore.getState().dispatchError(errorMessage, 'error');
            });
        }
    },

    clearProfileData: () => {
        set({
            nodes: [],
            edges: [],
            isLoading: false,
            error: null,
        });
    },
}));
