import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    IsValidConnection,
    Connection,
    OnConnect,
    Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeStore } from '../../stores/useNodeStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useUIStore } from '../../stores/useUIStore';
import { CanvasNode } from '../../types/nodeEditor';
import { useShallow } from 'zustand/react/shallow';
import { EmptyCanvasGuide } from './EmptyCanvasGuide';
import { LedgerSourceNode } from './nodes/LedgerSourceNode';
import { CorrelationNode } from './nodes/CorrelationNode';
import { ArithmeticNode } from './nodes/ArithmeticNode';
import { TriggerNode } from './nodes/TriggerNode';
import { DashboardOutputNode } from './nodes/DashboardOutputNode';
import { ContainerNode } from './nodes/ContainerNode';
import { DataEdge } from './edges/DataEdge';
import { SelectionBadge } from './components/SelectionBadge';
import './styles/containerAnimations.css';
import { useParams } from 'react-router-dom';
import { NodeToolbar } from './NodeToolbar';
import { NavigationToolbar } from './components/NavigationToolbar';
import { ViewControls } from './components/ViewControls';
import { ShortcutHelpPanel } from './components/ShortcutHelpPanel';
import { useNodeKeyboardShortcuts } from './hooks/useNodeKeyboardShortcuts';
import { isTypeCompatible } from './types/port';
import { getPortTypeFromHandle } from './utils/getPortTypeFromHandle';
import { showRejectionNotification, announceRejection } from './utils/rejectionNotification';
import { ConnectionLine } from './components/ConnectionLine';
import './styles/connectionLine.css';
import { setupNodeDataChangeSubscription } from './utils/edgeDataFlow';
import { HydrationProgressIndicator } from './components/HydrationProgressIndicator';
import { ledgerDataCache } from './utils/ledgerDataCache';
import { hydrateLedgerWithGhosts } from './utils/ghostReference';
import { setupSchemaChangeSubscription } from './utils/schemaChangeHandler';
import { unsubscribeAll, getActiveSubscriptionCount, getTotalConsumerCount } from './utils/subscriptionRegistry';
import { logSubscriptionCount, logHydrationSummary } from './utils/performanceMonitor';
import { useLedgerStore } from '../../stores/useLedgerStore';

// --- STABLE CONFIGURATION (Outside component to prevent re-renders) ---

const nodeTypes = {
    ledgerSource: LedgerSourceNode,
    correlation: CorrelationNode,
    arithmetic: ArithmeticNode,
    trigger: TriggerNode,
    dashboardOutput: DashboardOutputNode,
    container: ContainerNode,
};

const edgeTypes = {
    data: DataEdge,
};

const defaultEdgeOptions = {
    type: 'data',
    animated: true
};

/**
 * NodeCanvas — The Node Forge editor.
 *
 * Store Integration:
 * 1. Subscribes to useNodeStore.nodes/edges via useShallow for shallow comparison.
 * 2. Uses store's onNodesChange/onEdgesChange to keep Zustand store in sync with RF.
 * 3. Handles workflowId changes via proper debounce cleanup.
 * 4. Uses store's debouncedSaveCanvas for persistence.
 * 5. Viewport-space node positioning for handleAddFirstNode.
 * 6. Event handlers wired to trigger debounced saves.
 * 
 * Story 4.4 Additions:
 * - NavigationToolbar: Zoom/fit controls (top-left)
 * - ViewControls: Minimap/grid toggle panel (top-right)
 * - MiniMap: Custom styled minimap (bottom-right)
 * - ShortcutHelpPanel: Keyboard shortcuts reference (? key)
 * - useNodeKeyboardShortcuts: Hook for keyboard navigation
 */
export const NodeCanvas: React.FC = () => {
    // 1. Precise selectors for stable dependencies
    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const { projectId, workflowId } = useParams<{ projectId: string; workflowId: string }>();

    // UI Store actions - use stable selectors
    const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
    const setRightInspector = useUIStore(s => s.setRightInspector);

    // Node Store - subscribe to nodes/edges with useShallow for shallow comparison
    const isLoading = useNodeStore(s => s.isLoading);
    const isCanvasLoaded = useNodeStore(s => s.isCanvasLoaded);
    const nodes = useNodeStore(useShallow(s => s.nodes));
    const edges = useNodeStore(useShallow(s => s.edges));
    const initialViewport = useMemo(() => useNodeStore.getState().viewport, []);
    
    // View controls for MiniMap (Story 4.4)
    const viewControls = useNodeStore(s => s.viewControls);
    const { showMinimap, showGrid, snapToGrid } = viewControls;

    // Help panel state (Story 4.4)
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    
    // Selection state (Story 4.9)
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

    // Hydration progress state (Story 4.10)
    const [hydrationProgress, setHydrationProgress] = useState<{
        isActive: boolean;
        message: string;
    }>({
        isActive: false,
        message: ''
    });

    // Detect dark mode for MiniMap theming
    const [isDarkMode, setIsDarkMode] = useState(() => 
        document.documentElement.classList.contains('dark')
    );
    
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDarkMode(document.documentElement.classList.contains('dark'));
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // Set up edge data flow subscription (Story 4.10)
    useEffect(() => {
        const unsubscribe = setupNodeDataChangeSubscription();
        return () => { unsubscribe(); };
    }, []);

    // Story 4.10: Keep nodeStore.schemas in sync with ledgerStore.schemas
    // so that schemaChangeHandler can detect schema diffs without importing useLedgerStore
    const ledgerSchemas = useLedgerStore(useShallow(s => s.schemas));
    useEffect(() => {
        useNodeStore.getState().setSchemas(ledgerSchemas);
    }, [ledgerSchemas]);

    // Story 4.10: Cancel all PouchDB ledger subscriptions on workflow switch or unmount (AC7)
    useEffect(() => {
        return () => {
            unsubscribeAll();
            if (process.env.NODE_ENV === 'development') {
                logSubscriptionCount(getActiveSubscriptionCount(), getTotalConsumerCount());
            }
        };
    }, [workflowId]);

    // Concurrent hydration of all ledger nodes (Story 4.10 AC #4 & #5)
    useEffect(() => {
        if (!nodes.length || !isCanvasLoaded) return;

        const hydrateAllLedgerNodes = async () => {
            const ledgerNodes = nodes.filter(node => node.type === 'ledgerSource');
            if (ledgerNodes.length === 0) return;

            // Show progress indicator and mark hydrating
            setHydrationProgress({
                isActive: true,
                message: `Hydrating ${ledgerNodes.length} ledger${ledgerNodes.length > 1 ? 's' : ''}...`
            });
            useNodeStore.getState().setHydrationState({ isHydrating: true });

            // Batch: set loading state on all ledger nodes in one store update
            useNodeStore.getState().batchUpdateNodeData(
                ledgerNodes.map(node => ({ nodeId: node.id, data: { isLoading: true, error: undefined } }))
            );

            let completedCount = 0;
            const startTime = performance.now();

            const hydrationPromises = ledgerNodes.map(async (node) => {
                const ledgerId = node.data.ledgerId as string | undefined;
                const schemaSnapshot = node.data.schemaSnapshot as any[];

                if (!ledgerId || !schemaSnapshot?.length) {
                    useNodeStore.getState().updateNodeData(node.id, {
                        isLoading: false,
                        error: 'Missing ledger ID or schema'
                    });
                    completedCount++;
                    setHydrationProgress(prev => ({
                        ...prev,
                        message: `Hydrating... (${completedCount}/${ledgerNodes.length})`
                    }));
                    return;
                }

                try {
                    const result = await hydrateLedgerWithGhosts(ledgerId, schemaSnapshot);
                    useNodeStore.getState().updateNodeData(node.id, {
                        entries: result.entries,
                        count: result.entries.length,
                        ghosts: result.ghosts,
                        ghostCount: result.ghostCount,
                        isLoading: false,
                        error: undefined,
                        lastUpdated: new Date().toISOString()
                    });
                    useNodeStore.getState().setHydrationState({
                        hydratedLedgerIds: [
                            ...useNodeStore.getState().hydrationState.hydratedLedgerIds,
                            ledgerId,
                        ],
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Hydration failed';
                    useNodeStore.getState().updateNodeData(node.id, {
                        isLoading: false,
                        error: errorMessage
                    });
                    useNodeStore.getState().setHydrationState({
                        errors: {
                            ...useNodeStore.getState().hydrationState.errors,
                            [ledgerId]: errorMessage,
                        },
                    });
                }

                completedCount++;
                setHydrationProgress(prev => ({
                    ...prev,
                    message: `Hydrating... (${completedCount}/${ledgerNodes.length})`
                }));
            });

            await Promise.allSettled(hydrationPromises);

            const totalMs = performance.now() - startTime;
            logHydrationSummary(ledgerNodes.length, totalMs);

            useNodeStore.getState().setHydrationState({ isHydrating: false });
            setHydrationProgress({ isActive: false, message: '' });
        };

        hydrateAllLedgerNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCanvasLoaded]);

    const loadedWorkflowRef = useRef<string | null>(null);
    const loadAbortRef = useRef(false);
    const renderCountRef = useRef(0);
    renderCountRef.current++;

    // Initialize keyboard shortcuts (Story 4.4)
    const { announcement } = useNodeKeyboardShortcuts({
        onOpenHelp: () => setIsHelpOpen(true),
    });

    // Story 4-8: Connection tracking for rejection notifications
    const connectionAttemptRef = useRef<{
        isConnecting: boolean;
        sourceHandle: string | null;
        targetHandle: string | null;
        source: string | null;
        target: string | null;
    }>({
        isConnecting: false,
        sourceHandle: null,
        targetHandle: null,
        source: null,
        target: null,
    });

    // DEBUG: Log renders to catch loops early
    if (renderCountRef.current % 50 === 0) {
        console.warn(`[NodeCanvas] High render count detected: ${renderCountRef.current}. Nodes: ${nodes.length}`);
    }

    // Reset loadedRef when workflowId changes
    useEffect(() => {
        loadedWorkflowRef.current = null;
        loadAbortRef.current = false;
    }, [workflowId]);

    // Initial Load (per workflowId) - with proper cleanup
    useEffect(() => {
        if (!activeProfileId || !projectId || !workflowId) return;
        if (loadedWorkflowRef.current === workflowId) return;

        console.log('[NodeCanvas] Initial load triggered');
        
        // CRITICAL ORDER: 1. Clear debounce, 2. Mark not loaded, 3. Load
        useNodeStore.getState().clearDebouncedSave();
        useNodeStore.getState().setIsCanvasLoaded(false);
        
        loadedWorkflowRef.current = workflowId;
        loadAbortRef.current = false;

        useNodeStore.getState().loadCanvas(activeProfileId, projectId, workflowId)
            .catch(() => { /* load errors handled in store */ });
    }, [activeProfileId, projectId, workflowId]);

    // Cleanup on unmount or workflow change
    useEffect(() => {
        return () => {
            loadAbortRef.current = true;
            useNodeStore.getState().clearDebouncedSave();
        };
    }, [workflowId, activeProfileId, projectId]);

    // Story 4-8 AC5 & 4.10 AC6: Schema change subscription with throttling
    // Subscribe to ledger schema changes with 100ms debounce to prevent cascade storms
    useEffect(() => {
        const unsubscribeSchemaChanges = setupSchemaChangeSubscription();

        // Also subscribe to schema changes in the store for cache invalidation
        const unsubscribeStore = useNodeStore.subscribe(
            (state) => state.schemas,
            (_schemas) => {
                // When schemas change, invalidate cache for affected ledgers
                console.log('[Cache] Invalidating cache due to schema changes');
                ledgerDataCache.clear(); // For now, clear all cache on any schema change

                // When schemas change, re-validate all edges
                const currentNodes = useNodeStore.getState().nodes;
                const currentEdges = useNodeStore.getState().edges;

                // Import validation function dynamically to avoid circular deps
                import('./utils/edgeValidation').then(({ validateGraphEdges }) => {
                    const validEdges = validateGraphEdges(currentEdges, currentNodes);

                    // Only update if edges were removed
                    if (validEdges.length !== currentEdges.length) {
                        useNodeStore.getState().setEdges(validEdges);
                        useNodeStore.getState().debouncedSaveCanvas();

                        if (process.env.NODE_ENV === 'development') {
                            console.log('[EdgeValidation] Removed invalid edges after schema change:',
                                currentEdges.length - validEdges.length);
                        }
                    }
                });
            }
        );

        return () => {
            unsubscribeSchemaChanges();
            unsubscribeStore();
        };
    }, []);

    // 5. Stable Handlers - use store's onConnect to keep store in sync
    // Task 5: Wire structural changes to debounced save
    const onNodesChange = useCallback(
        (changes: any) => {
            useNodeStore.getState().onNodesChange(changes);
            // React Flow batches multiple changes into single callback
            // Call debounced save after structural changes
            if (changes.length > 0) {
                useNodeStore.getState().debouncedSaveCanvas();
            }
        },
        []
    );

    const onEdgesChange = useCallback(
        (changes: any) => {
            useNodeStore.getState().onEdgesChange(changes);
            // Call debounced save after structural changes
            if (changes.length > 0) {
                useNodeStore.getState().debouncedSaveCanvas();
            }
        },
        []
    );

    const onConnect: OnConnect = useCallback(
        (connection: Connection) => {
            useNodeStore.getState().onConnect(connection);
            // Call debounced save after new connection
            useNodeStore.getState().debouncedSaveCanvas();
            // Mark connection as successful
            connectionAttemptRef.current.isConnecting = false;
        },
        []
    );

    // Story 4-8: Track connection start for rejection detection
    const onConnectStart = useCallback((
        _event: MouseEvent | TouchEvent,
        { handleId, nodeId }: { handleId: string | null; nodeId: string | null }
    ) => {
        if (!nodeId) return;
        connectionAttemptRef.current = {
            isConnecting: true,
            sourceHandle: handleId,
            source: nodeId,
            targetHandle: null,
            target: null,
        };
    }, []);

    // Story 4-8: Track connection end for rejection detection and notifications
    // Use store.getState() instead of captured nodes to avoid stale closure
    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        const attempt = connectionAttemptRef.current;

        // If we were connecting but onConnect was never called, it was rejected
        if (attempt.isConnecting && attempt.source && attempt.sourceHandle) {
            // Determine what handle we dropped on (if any)
            // Use composedPath for shadow DOM support, fallback to event.target
            const target = (event.composedPath?.()[0] ?? event.target) as EventTarget | null;

            // Safely check if target is an Element before calling closest()
            if (!(target instanceof Element)) {
                // Reset connection state before returning
                connectionAttemptRef.current = {
                    isConnecting: false,
                    sourceHandle: null,
                    source: null,
                    targetHandle: null,
                    target: null,
                };
                return;
            }

            const handleElement = target.closest('.react-flow__handle') as HTMLElement | null;

            if (handleElement) {
                const targetNodeId = handleElement.dataset.nodeid;
                const targetHandleId = handleElement.dataset.handleid;

                if (targetNodeId && targetHandleId) {
                    // Get latest nodes from store to avoid stale closure
                    const currentNodes = useNodeStore.getState().nodes;
                    
                    // Get types for rejection notification
                    const sourceType = getPortTypeFromHandle(
                        attempt.source,
                        attempt.sourceHandle,
                        currentNodes
                    );
                    const targetType = getPortTypeFromHandle(
                        targetNodeId,
                        targetHandleId,
                        currentNodes
                    );

                    // Show rejection notification
                    showRejectionNotification(sourceType, targetType);

                    // Announce to screen readers
                    announceRejection(sourceType, targetType);
                }
            }
        }

        // Reset connection state
        connectionAttemptRef.current = {
            isConnecting: false,
            sourceHandle: null,
            source: null,
            targetHandle: null,
            target: null,
        };
    }, []); // No dependencies - uses store.getState() for latest data

    // Task 6: Implement viewport change persistence
    const onViewportChange = useCallback(
        (vp: { x: number; y: number; zoom: number }) => {
            useNodeStore.getState().setViewport(vp);
            // Trigger debounced save for viewport changes
            useNodeStore.getState().debouncedSaveCanvas();
        },
        []
    );

    const isDraggingRef = useRef(false);

    const onNodeDragStart = useCallback(() => {
        isDraggingRef.current = true;
    }, []);

    const onNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node | null) => {
            isDraggingRef.current = false;
            if (!node) return;
            useNodeStore.getState().debouncedSaveCanvas();
        },
        []
    );

    /**
     * Story 4-8: Strict Edge Type Validation
     * isValidConnection callback for React Flow
     *
     * Validates connection attempts using the strict type compatibility matrix.
     * Performance critical: must complete in <1ms to maintain 60fps during edge drag.
     */
    const isValidConnection: IsValidConnection<any> = useCallback((connection) => {
        const { sourceHandle, targetHandle, source, target } = connection;

        // Basic validation: all connection fields must be present
        if (!sourceHandle || !targetHandle || !source || !target) {
            return false;
        }

        // Development mode: measure performance
        const startTime = process.env.NODE_ENV === 'development' ? performance.now() : 0;

        // Use getPortTypeFromHandle to extract types (handles all node types)
        const sourceType = getPortTypeFromHandle(source, sourceHandle, nodes);
        const targetType = getPortTypeFromHandle(target, targetHandle, nodes);

        const isValid = isTypeCompatible(sourceType, targetType);

        // Development mode: log validation attempts for debugging
        if (process.env.NODE_ENV === 'development') {
            const duration = performance.now() - startTime;

            if (duration > 1) {
                console.warn(`[EdgeValidation] Slow validation: ${duration.toFixed(2)}ms`, {
                    source: `${source}:${sourceHandle}`,
                    target: `${target}:${targetHandle}`,
                    sourceType,
                    targetType,
                });
            }

            // Log all validation attempts
            console.log('[EdgeValidation]', {
                source: `${source}:${sourceHandle}`,
                target: `${target}:${targetHandle}`,
                sourceType,
                targetType,
                isValid,
                reason: isValid ? 'compatible' : (sourceType && targetType ? 'type_mismatch' : 'unknown_type'),
            });
        }

        return isValid;
    }, [nodes]);

    const handleSelectionChange = useCallback(({ nodes: selected }: { nodes: CanvasNode[] }) => {
        const ids = selected.map(n => n.id);
        setSelectedNodeIds(ids);
        
        const first = selected[0];
        if (first) {
            setSelectedNodeId(first.id);
            if (!isDraggingRef.current) {
                setRightInspector(true);
            }
        } else {
            setSelectedNodeId(null);
        }
    }, [setSelectedNodeId, setRightInspector]);

// Safe UUID generator with fallback for non-HTTPS contexts
const generateNodeId = (): string => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch {
        // crypto.randomUUID may throw in insecure contexts
    }
    // Fallback: generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

    const handleAddFirstNode = useCallback(() => {
        const viewport = useNodeStore.getState().viewport || { x: 0, y: 0, zoom: 1 };
        const zoom = viewport.zoom || 1;
        const centerX = (window.innerWidth / 2 - viewport.x) / zoom;
        const centerY = (window.innerHeight / 2 - viewport.y) / zoom;
        const newNode: CanvasNode = {
            id: `ledgerSource-${generateNodeId()}`,
            type: 'ledgerSource',
            position: { x: centerX - 100, y: centerY - 100 },
            data: { label: 'New Ledger Source' }
        };
        const currentNodes = useNodeStore.getState().nodes;
        useNodeStore.getState().setNodes([...currentNodes, newNode]);
        // Trigger debounced save after adding node
        useNodeStore.getState().debouncedSaveCanvas();
    }, []);

    // Keyboard shortcuts (Story 4.9: Grouping shortcuts)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd+S manual save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (!activeProfileId || !projectId || !workflowId) return;
                const state = useNodeStore.getState();
                if (!state.isCanvasLoaded) return;
                state.clearDebouncedSave();
                state.saveCanvasWithRetry(
                    { profileId: activeProfileId, projectId, workflowId },
                    { nodes: state.nodes, edges: state.edges, viewport: state.viewport, viewControls: state.viewControls }
                );
                return;
            }
            
            // Ctrl/Cmd+A - Select all nodes
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
                e.preventDefault();
                const allNodes = useNodeStore.getState().nodes;
                setSelectedNodeIds(allNodes.map(n => n.id));
                return;
            }
            
            // Escape - Clear selection
            if (e.key === 'Escape') {
                setSelectedNodeIds([]);
                return;
            }
            
            // Ctrl/Cmd+G - Group selected nodes
            if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
                e.preventDefault();
                if (selectedNodeIds.length >= 2) {
                    useNodeStore.getState().groupNodes(selectedNodeIds);
                    setSelectedNodeIds([]);
                }
                return;
            }
            
            // Ctrl/Cmd+Shift+G - Ungroup selected container
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
                e.preventDefault();
                const state = useNodeStore.getState();
                const selectedContainer = state.nodes.find(
                    n => selectedNodeIds.includes(n.id) && n.type === 'container'
                );
                if (selectedContainer) {
                    state.ungroupNodes(selectedContainer.id);
                    setSelectedNodeIds([]);
                }
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeProfileId, projectId, workflowId, selectedNodeIds]);

    // --- RENDER ---

    if (nodes.length === 0 && !isLoading && loadedWorkflowRef.current === workflowId) {
        return (
            <div style={{ width: '100%', height: '100%' }} className="bg-white dark:bg-zinc-950 relative">
                <EmptyCanvasGuide onAddFirstNode={handleAddFirstNode} />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onSelectionChange={handleSelectionChange}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineComponent={ConnectionLine as any}
                fitView
                selectionOnDrag={true}
                selectionKeyCode={['Shift']}
                className="bg-white dark:bg-zinc-950"
            >
                    <NodeToolbar />
                    <NavigationToolbar />
                    <ViewControls />
                    {/* Built-in MiniMap with theme-aware colors - hidden when no nodes (AC2 edge case) */}
                    {showMinimap && nodes.length > 0 && (
                        <MiniMap
                            bgColor={isDarkMode ? '#18181b' : '#ffffff'}
                            maskColor={isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.6)'}
                            nodeColor={isDarkMode ? '#3f3f46' : '#e2e2e2'}
                            maskStrokeColor={isDarkMode ? '#10b981' : '#059669'}
                        />
                    )}
                    {showGrid && <Background color="#3f3f46" gap={20} />}
                <Controls showZoom={false} showFitView={false} showInteractive={false} />
            </ReactFlow>
            {/* Selection badge (Story 4.9) */}
            <SelectionBadge count={selectedNodeIds.length} />
            {/* ARIA Live region for announcements */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
            </div>
            {/* Shortcut Help Panel */}
            <ShortcutHelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}

    return (
        <div style={{ width: '100%', height: '100%' }} className="bg-white dark:bg-zinc-950 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onViewportChange={onViewportChange}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onSelectionChange={handleSelectionChange}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineComponent={ConnectionLine as any}
                defaultViewport={initialViewport}
                panActivationKeyCode={['Space']}
                selectionKeyCode={['Shift']}
                className="bg-white dark:bg-zinc-950"
                snapToGrid={snapToGrid}
                snapGrid={[Math.max(1, viewControls.gridSize || 15), Math.max(1, viewControls.gridSize || 15)]}
            >
                <NodeToolbar />
                <NavigationToolbar />
                <ViewControls />
                {/* Built-in MiniMap with theme-aware colors - hidden when no nodes (AC2 edge case) */}
                {showMinimap && nodes.length > 0 && (
                    <MiniMap
                        bgColor={isDarkMode ? '#18181b' : '#ffffff'}
                        maskColor={isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(240, 240, 240, 0.6)'}
                        nodeColor={isDarkMode ? '#3f3f46' : '#e2e2e2'}
                        maskStrokeColor={isDarkMode ? '#10b981' : '#059669'}
                    />
                )}
                {showGrid && <Background color="#3f3f46" gap={20} />}
                <Controls showZoom={false} showFitView={false} showInteractive={false} />
            </ReactFlow>

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-black/20 backdrop-blur-[2px]">
                    <Card className="bg-gray-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 py-2 rounded-lg text-zinc-400 text-sm animate-pulse">
                        <CardContent>
                            Synchronizing Graph...
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ARIA Live region for announcements (Story 4.4) */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
            </div>

            {/* Hydration Progress Indicator (Story 4.10) */}
            <HydrationProgressIndicator
                isVisible={hydrationProgress.isActive}
                message={hydrationProgress.message}
            />

            {/* Shortcut Help Panel (Story 4.4) */}
            <ShortcutHelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
};

export default NodeCanvas;
