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
import { CanvasNode, CanvasEdge, Viewport, ViewControlsState, DEFAULT_VIEW_CONTROLS } from '../types/nodeEditor';
import { save_canvas, load_canvas } from '../lib/db';
import { SAVE_DEBOUNCE_MS, SAVE_MAX_RETRIES, SAVE_RETRY_DELAYS_MS } from '../features/nodeEditor/utils/nodeConstants';
import { groupNodes as groupNodesUtil } from '../features/nodeEditor/utils/groupNodes';
import { ungroupNodes as ungroupNodesUtil } from '../features/nodeEditor/utils/ungroupNodes';

// Module-level debounce timer - NOT in store state to avoid re-renders
let saveTimeoutId: number | null = null;

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = SAVE_DEBOUNCE_MS;

// Retry configuration
const MAX_RETRIES = SAVE_MAX_RETRIES;
const RETRY_DELAYS = [...SAVE_RETRY_DELAYS_MS]; // Exponential backoff

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
    isProfileSwitching: boolean; // Prevents saves during profile transition
    saveError: string | null;
    lastSavedAt: number | null;

    // View controls (Story 4.4) - nested to reduce subscriptions
    viewControls: ViewControlsState;

    // React Flow handlers (per official docs pattern)
    onNodesChange: OnNodesChange<CanvasNode>;
    onEdgesChange: OnEdgesChange<CanvasEdge>;
    onConnect: OnConnect;

    // Actions
    loadCanvas: (profileId: string, projectId: string, workflowId: string) => Promise<void>;
    saveCanvas: (profileId: string, projectId: string, workflowId: string, nodes?: CanvasNode[], edges?: CanvasEdge[], viewport?: Viewport, viewControls?: ViewControlsState) => Promise<void>;
    setNodes: (nodes: CanvasNode[]) => void;
    setEdges: (edges: CanvasEdge[]) => void;
    setViewport: (viewport: Viewport) => void;
    updateNodeData: (nodeId: string, data: Record<string, any>) => void;
    clearProfileData: () => void;
    
    // View control actions (Story 4.4)
    setViewControls: (controls: Partial<ViewControlsState>) => void;
    setShowMinimap: (show: boolean) => void;
    setShowGrid: (show: boolean) => void;
    setSnapToGrid: (snap: boolean) => void;
    setGridSize: (size: number) => void;
    setViewControlsCollapsed: (collapsed: boolean) => void;
    
    // Debounced persistence actions
    debouncedSaveCanvas: () => void;
    clearDebouncedSave: () => void;
    saveCanvasWithRetry: (ids: SaveIds, data: SaveData, attemptCount?: number) => Promise<void>;
    setIsCanvasLoaded: (loaded: boolean) => void;
    
    // Container actions (Story 4.9)
    groupNodes: (nodeIds: string[], label?: string) => string | null;
    ungroupNodes: (containerId: string) => void;
    expandContainer: (containerId: string) => void;
    collapseContainer: (containerId: string) => void;
    setContainerLabel: (containerId: string, label: string) => void;
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
    viewControls: ViewControlsState;
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
    isProfileSwitching: false,
    saveError: null,
    lastSavedAt: null,
    viewControls: DEFAULT_VIEW_CONTROLS,
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
                    // Migration: apply defaults if viewControls missing (legacy document)
                    const viewControls = canvas.viewControls ?? DEFAULT_VIEW_CONTROLS;
                    set({
                        nodes: canvas.nodes || [],
                        edges: canvas.edges || [],
                        viewport: canvas.viewport || DEFAULT_VIEWPORT,
                        viewControls,
                        isLoading: false,
                        isCanvasLoaded: true,
                    });
                } else {
                    set({ nodes: [], edges: [], viewport: DEFAULT_VIEWPORT, viewControls: DEFAULT_VIEW_CONTROLS, isLoading: false, isCanvasLoaded: true });
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
            viewport?: Viewport,
            viewControls?: ViewControlsState
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
                const vc = viewControls ?? state.viewControls;
                const db = getProfileDb(profileId);
                await save_canvas(db, workflowId, n, e, v, vc, profileId, authState.encryptionKey || undefined);
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

        // View control actions (Story 4.4)
        setViewControls: (controls) => set((state) => ({
            viewControls: { ...state.viewControls, ...controls }
        })),
        setShowMinimap: (show) => set((state) => ({
            viewControls: { ...state.viewControls, showMinimap: show }
        })),
        setShowGrid: (show) => set((state) => ({
            viewControls: { ...state.viewControls, showGrid: show }
        })),
        setSnapToGrid: (snap) => set((state) => ({
            viewControls: { ...state.viewControls, snapToGrid: snap }
        })),
        setGridSize: (size) => set((state) => ({
            viewControls: { ...state.viewControls, gridSize: size }
        })),
        setViewControlsCollapsed: (collapsed) => set((state) => ({
            viewControls: { ...state.viewControls, isViewControlsCollapsed: collapsed }
        })),
        
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
        // CRITICAL: Captures IDs at CALL time, reads FRESH state at save time to prevent stale data
        debouncedSaveCanvas: () => {
            const state = get();
            
            // Don't save if canvas hasn't finished loading yet
            if (!state.isCanvasLoaded) return;
            if (state.isSaveInProgress) return; // Prevent concurrent saves
            
            // Capture IDs IMMEDIATELY at call time to prevent cross-workflow saves
            const capturedProfileId = state.activeProfileId;
            const capturedProjectId = state.activeProjectId;
            const capturedWorkflowId = state.activeWorkflowId;
            
            // Validate captured IDs
            if (!capturedProfileId || !capturedProjectId || !capturedWorkflowId) return;
            
            // Clear existing timeout
            if (saveTimeoutId) {
                clearTimeout(saveTimeoutId);
            }
            
            // Set new timeout - read FRESH state at save time to prevent stale data
            saveTimeoutId = window.setTimeout(() => {
                // Read FRESH state inside timeout to get latest data
                const current = get();
                
                // Verify IDs still match before saving (prevent cross-workflow save)
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
                            nodes: current.nodes, 
                            edges: current.edges, 
                            viewport: current.viewport,
                            viewControls: current.viewControls
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
                    data.viewport,
                    data.viewControls
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
                            // Read FRESH state on retry to avoid stale data issues
                            const freshData: SaveData = {
                                nodes: current.nodes,
                                edges: current.edges,
                                viewport: current.viewport,
                                viewControls: current.viewControls,
                            };
                            get().saveCanvasWithRetry(ids, freshData, attemptCount + 1);
                        }
                    }, RETRY_DELAYS[attemptCount]);
                }
            }
        },
        
        // Container actions (Story 4.9)
        groupNodes: (nodeIds: string[], label?: string): string | null => {
            const state = get();
            const result = groupNodesUtil(nodeIds, state.nodes, label);
            
            if (!result) return null;
            
            const { container, updatedChildren } = result;
            
            // Replace updated children and add container
            const newNodes = state.nodes.map(n => {
                const updated = updatedChildren.find(u => u.id === n.id);
                return updated || n;
            }).concat(container);
            
            set({ nodes: newNodes });
            get().debouncedSaveCanvas();
            
            return container.id;
        },
        
        ungroupNodes: (containerId: string) => {
            const state = get();
            const result = ungroupNodesUtil(containerId, state.nodes);
            
            if (!result) return;
            
            const { restoredNodes, childNodeIds } = result;
            
            // Remove container and update children
            const newNodes = state.nodes
                .filter(n => n.id !== containerId)
                .map(n => {
                    const restored = restoredNodes.find(r => r.id === n.id);
                    return restored || n;
                });
            
            set({ nodes: newNodes });
            get().debouncedSaveCanvas();
        },
        
        expandContainer: (containerId: string) => {
            set({
                nodes: get().nodes.map(n =>
                    n.id === containerId 
                        ? { ...n, data: { ...n.data, isCollapsed: false } } 
                        : n
                ),
            });
            get().debouncedSaveCanvas();
        },
        
        collapseContainer: (containerId: string) => {
            set({
                nodes: get().nodes.map(n =>
                    n.id === containerId 
                        ? { ...n, data: { ...n.data, isCollapsed: true } } 
                        : n
                ),
            });
            get().debouncedSaveCanvas();
        },
        
        setContainerLabel: (containerId: string, label: string) => {
            set({
                nodes: get().nodes.map(n =>
                    n.id === containerId 
                        ? { ...n, data: { ...n.data, label } } 
                        : n
                ),
            });
            get().debouncedSaveCanvas();
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
        
        const { activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport, viewControls, isCanvasLoaded, isSaveInProgress } = state;
        
        // Don't save if already in progress or canvas not loaded (prevents race during profile switch)
        if (activeProfileId && activeProjectId && activeWorkflowId && isCanvasLoaded && !isSaveInProgress) {
            // Fire and forget - don't await
            state.saveCanvas(activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport, viewControls).catch(() => {
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
        const { activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport, viewControls, isCanvasLoaded, isSaveInProgress } = state;
        
        // Don't save if already in progress or canvas not loaded (prevents race during profile switch)
        if (activeProfileId && activeProjectId && activeWorkflowId && isCanvasLoaded && !isSaveInProgress) {
            // Fire and forget - can't await in beforeunload
            state.saveCanvas(activeProfileId, activeProjectId, activeWorkflowId, nodes, edges, viewport, viewControls).catch(() => {
                // Error already handled in saveCanvas
            });
        }
        
        // Show warning if there was pending save
        e.preventDefault();
        e.returnValue = '';
    }
}

// Track event listener registration state
let eventListenersRegistered = false;

/**
 * Register global event listeners for auto-save on tab hide/close
 * Call this once when the app initializes
 */
export function registerAutoSaveListeners(): void {
    if (typeof document !== 'undefined' && !eventListenersRegistered) {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        eventListenersRegistered = true;
    }
}

/**
 * Unregister global event listeners (useful for testing)
 */
export function unregisterAutoSaveListeners(): void {
    if (typeof document !== 'undefined' && eventListenersRegistered) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        eventListenersRegistered = false;
    }
}

// Auto-register on module load (for backward compatibility)
registerAutoSaveListeners();

// Export for testing
export { saveTimeoutId, DEBOUNCE_DELAY, MAX_RETRIES, RETRY_DELAYS };
