import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
} from '@xyflow/react';
import { getProfileDb } from '../lib/db';
import { useErrorStore } from './useErrorStore';
import { useAuthStore } from '../features/auth/useAuthStore';
import { CanvasNode, CanvasEdge, Viewport } from '../types/nodeEditor';
import { save_canvas, load_canvas } from '../lib/db';

// Module-level debounce timer - NOT in store state to avoid re-renders
let saveTimeoutId: number | null = null;

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

interface NodeState {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
    isLoading: boolean;
    error: string | null;
    activeProfileId: string | null;
    activeProjectId: string | null;
    activeWorkflowId: string | null;
    
    // Canvas load/save state
    isCanvasLoaded: boolean;
    isSaveInProgress: boolean;
    saveError: string | null;
    lastSavedAt: number | null;

    // React Flow handlers (per official docs pattern)
    onNodesChange: OnNodesChange<CanvasNode>;
    onEdgesChange: OnEdgesChange<CanvasEdge>;
    onConnect: OnConnect;

    // Actions
    loadCanvas: (profileId: string, projectId: string, workflowId: string) => Promise<void>;
    saveCanvas: (profileId: string, projectId: string, workflowId: string, nodes?: CanvasNode[], edges?: CanvasEdge[], viewport?: Viewport) => Promise<void>;
    setNodes: (nodes: CanvasNode[]) => void;
    setEdges: (edges: CanvasEdge[]) => void;
    setViewport: (viewport: Viewport) => void;
    updateNodeData: (nodeId: string, data: Record<string, any>) => void;
    clearProfileData: () => void;
    
    // Debounced persistence actions
    debouncedSaveCanvas: () => void;
    clearDebouncedSave: () => void;
    saveCanvasWithRetry: (ids: SaveIds, data: SaveData, attemptCount?: number) => Promise<void>;
    setIsCanvasLoaded: (loaded: boolean) => void;
}

interface SaveIds {
    profileId: string;
    projectId: string;
    workflowId: string;
}

interface SaveData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    viewport: Viewport;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const initialState = {
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
    isLoading: false,
    error: null,
    activeProfileId: null,
    activeProjectId: null,
    activeWorkflowId: null,
    isCanvasLoaded: false,
    isSaveInProgress: false,
    saveError: null,
    lastSavedAt: null,
};

export const useNodeStore = create<NodeState>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        // Official React Flow + Zustand pattern:
        // applyNodeChanges handles internal RF changes (drag, select, resize)
        // These do NOT trigger computation - they're just position bookkeeping
        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes),
            });
        },

        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges),
            });
        },

        onConnect: (connection) => {
            set({
                edges: addEdge(connection, get().edges),
            });
        },

        loadCanvas: async (profileId: string, projectId: string, workflowId: string) => {
            set({ 
                isLoading: true, 
                error: null, 
                activeProfileId: profileId, 
                activeProjectId: projectId,
                activeWorkflowId: workflowId,
                isCanvasLoaded: false,
            });
            try {
                const authState = useAuthStore.getState();
                if (!authState.isUnlocked) throw new Error('Vault must be unlocked to load canvas.');

                const db = getProfileDb(profileId);
                const canvas = await load_canvas(db, workflowId, authState.encryptionKey || undefined);

                if (canvas) {
                    set({
                        nodes: canvas.nodes || [],
                        edges: canvas.edges || [],
                        viewport: canvas.viewport || DEFAULT_VIEWPORT,
                        isLoading: false,
                        isCanvasLoaded: true,
                    });
                } else {
                    set({ nodes: [], edges: [], viewport: DEFAULT_VIEWPORT, isLoading: false, isCanvasLoaded: true });
                }
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to load canvas';
                set({ error: errorMsg, isLoading: false, isCanvasLoaded: false });
                useErrorStore.getState().dispatchError(errorMsg);
            }
        },

        saveCanvas: async (
            profileId: string,
            _projectId: string,
            workflowId: string,
            nodes?: CanvasNode[], 
            edges?: CanvasEdge[],
            viewport?: Viewport
        ) => {
            try {
                const authState = useAuthStore.getState();
                if (!authState.isUnlocked) {
                    useErrorStore.getState().dispatchError('Cannot save canvas: vault is locked');
                    return;
                }

                const state = get();
                const n = nodes ?? state.nodes;
                const e = edges ?? state.edges;
                const v = viewport ?? state.viewport;
                const db = getProfileDb(profileId);
                await save_canvas(db, workflowId, n, e, v, profileId, authState.encryptionKey || undefined);
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to save canvas';
                set({ error: errorMsg });
                useErrorStore.getState().dispatchError(errorMsg);
                throw err; // Re-throw for retry logic
            }
        },

        setNodes: (nodes: CanvasNode[]) => set({ nodes }),

        setEdges: (edges: CanvasEdge[]) => set({ edges }),

        setViewport: (viewport: Viewport) => set({ viewport }),
        
        setIsCanvasLoaded: (loaded: boolean) => set({ isCanvasLoaded: loaded }),

        /** Update specific fields in a node's data object.
         *  Uses getState() pattern so it can be called from non-reactive contexts. */
        updateNodeData: (nodeId: string, data: Record<string, any>) => {
            set({
                nodes: get().nodes.map(n =>
                    n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
                ),
            });
        },

        clearProfileData: () => {
            // Clear any pending debounce before resetting state
            if (saveTimeoutId) {
                clearTimeout(saveTimeoutId);
                saveTimeoutId = null;
            }
            set(initialState);
        },

        // Debounced persistence mechanism
        // CRITICAL: Captures IDs and data at CALL time to prevent race conditions
        debouncedSaveCanvas: () => {
            const state = get();
            
            // Don't save if canvas hasn't finished loading yet
            if (!state.isCanvasLoaded) return;
            
            // Capture IDs and data IMMEDIATELY at call time to prevent race conditions
            const capturedProfileId = state.activeProfileId;
            const capturedProjectId = state.activeProjectId;
            const capturedWorkflowId = state.activeWorkflowId;
            const capturedNodes = state.nodes;
            const capturedEdges = state.edges;
            const capturedViewport = state.viewport;
            
            // Validate captured data
            if (!capturedProfileId || !capturedProjectId || !capturedWorkflowId) return;
            
            // Clear existing timeout
            if (saveTimeoutId) {
                clearTimeout(saveTimeoutId);
            }
            
            // Set new timeout using CAPTURED values (not fresh get())
            saveTimeoutId = window.setTimeout(() => {
                // Verify IDs still match before saving (prevent cross-workflow save)
                const current = get();
                if (
                    current.activeProfileId === capturedProfileId &&
                    current.activeProjectId === capturedProjectId &&
                    current.activeWorkflowId === capturedWorkflowId
                ) {
                    get().saveCanvasWithRetry(
                        { 
                            profileId: capturedProfileId, 
                            projectId: capturedProjectId, 
                            workflowId: capturedWorkflowId 
                        },
                        { 
                            nodes: capturedNodes, 
                            edges: capturedEdges, 
                            viewport: capturedViewport 
                        }
                    );
                }
                saveTimeoutId = null;
            }, DEBOUNCE_DELAY);
        },

        clearDebouncedSave: () => {
            if (saveTimeoutId) {
                clearTimeout(saveTimeoutId);
                saveTimeoutId = null;
            }
        },

        saveCanvasWithRetry: async (ids: SaveIds, data: SaveData, attemptCount = 0) => {
            set({ isSaveInProgress: true, saveError: null });
            
            try {
                await get().saveCanvas(
                    ids.profileId, 
                    ids.projectId, 
                    ids.workflowId, 
                    data.nodes, 
                    data.edges,
                    data.viewport
                );
                set({ 
                    isSaveInProgress: false, 
                    lastSavedAt: Date.now(), 
                    error: null,
                    saveError: null,
                });
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to save canvas changes';
                set({ 
                    error: errorMsg, 
                    saveError: errorMsg, 
                    isSaveInProgress: false 
                });
                useErrorStore.getState().dispatchError(errorMsg);
                
                // Retry logic with exponential backoff
                if (attemptCount < MAX_RETRIES) {
                    setTimeout(() => {
                        // Verify IDs still match before retrying
                        const current = get();
                        if (
                            current.activeProfileId === ids.profileId &&
                            current.activeProjectId === ids.projectId &&
                            current.activeWorkflowId === ids.workflowId
                        ) {
                            get().saveCanvasWithRetry(ids, data, attemptCount + 1);
                        }
                    }, RETRY_DELAYS[attemptCount]);
                }
            }
        },
    }))
);

// Event handlers for visibilitychange and beforeunload
// These are registered outside the store to handle global events

function handleVisibilityChange() {
    if (document.hidden) {
        // Tab hidden: clear debounce and save immediately
        const state = useNodeStore.getState();
        state.clearDebouncedSave();
        
        const { activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport, isCanvasLoaded } = state;
        if (activeProfileId && activeProjectId && activeWorkflowId && isCanvasLoaded) {
            // Fire and forget - don't await
            state.saveCanvas(activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport).catch(() => {
                // Error already handled in saveCanvas
            });
        }
    }
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
    const state = useNodeStore.getState();
    if (saveTimeoutId) {
        // Clear pending debounce
        state.clearDebouncedSave();
        
        // Attempt synchronous save (or warn user)
        const { activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport, isCanvasLoaded } = state;
        if (activeProfileId && activeProjectId && activeWorkflowId && isCanvasLoaded) {
            // Fire and forget - can't await in beforeunload
            state.saveCanvas(activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport).catch(() => {
                // Error already handled in saveCanvas
            });
        }
        
        // Show warning if there was pending save
        e.preventDefault();
        e.returnValue = '';
    }
}

// Register event listeners (only in browser environment)
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
}

// Export for testing
export { saveTimeoutId, DEBOUNCE_DELAY, MAX_RETRIES, RETRY_DELAYS };
