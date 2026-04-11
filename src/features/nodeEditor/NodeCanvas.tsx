import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    IsValidConnection,
    Connection,
    OnConnect,
    useShallow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeStore } from '../../stores/useNodeStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useUIStore } from '../../stores/useUIStore';
import { CanvasNode } from '../../types/nodeEditor';
import { EmptyCanvasGuide } from './EmptyCanvasGuide';
import { LedgerSourceNode } from './nodes/LedgerSourceNode';
import { CorrelationNode } from './nodes/CorrelationNode';
import { ArithmeticNode } from './nodes/ArithmeticNode';
import { TriggerNode } from './nodes/TriggerNode';
import { DashboardOutputNode } from './nodes/DashboardOutputNode';
import { DataEdge } from './edges/DataEdge';
import { useParams } from 'react-router-dom';
import { NodeToolbar } from './NodeToolbar';

// --- STABLE CONFIGURATION (Outside component to prevent re-renders) ---

const nodeTypes = {
    ledgerSource: LedgerSourceNode,
    correlation: CorrelationNode,
    arithmetic: ArithmeticNode,
    trigger: TriggerNode,
    dashboardOutput: DashboardOutputNode,
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
 * 3. Handles workflowId changes via loadedWorkflowRef reset.
 * 4. Debounced save with workflowId captured in ref to prevent cross-workflow saves.
 * 5. Viewport-space node positioning for handleAddFirstNode.
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
    const nodes = useNodeStore(s => s.nodes, useShallow);
    const edges = useNodeStore(s => s.edges, useShallow);
    const initialViewport = useMemo(() => useNodeStore.getState().viewport, []);

    const loadedWorkflowRef = useRef<string | null>(null);
    const renderCountRef = useRef(0);
    renderCountRef.current++;

    // DEBUG: Log renders to catch loops early
    if (renderCountRef.current % 50 === 0) {
        console.warn(`[NodeCanvas] High render count detected: ${renderCountRef.current}. Nodes: ${nodes.length}`);
    }

    // Task 1: Reset loadedRef when workflowId changes
    useEffect(() => {
        loadedWorkflowRef.current = null;
    }, [workflowId]);

    // 3. Initial Load (per workflowId)
    useEffect(() => {
        if (!activeProfileId || !projectId || !workflowId) return;
        if (loadedWorkflowRef.current === workflowId) return;

        console.log('[NodeCanvas] Initial load triggered');
        loadedWorkflowRef.current = workflowId;

        useNodeStore.getState().loadCanvas(activeProfileId, projectId, workflowId);
    }, [activeProfileId, projectId, workflowId]);

    // Task 3: Debounced Save with workflowId captured in ref to prevent cross-workflow saves
    const workflowIdRef = useRef(workflowId);
    useEffect(() => { workflowIdRef.current = workflowId; }, [workflowId]);

    useEffect(() => {
        if (loadedWorkflowRef.current !== workflowId || !activeProfileId || !projectId || !workflowId) return;

        const timer = setTimeout(() => {
            useNodeStore.getState().saveCanvas(
                activeProfileId,
                projectId,
                workflowIdRef.current,
                nodes,
                edges
            );
        }, 1000);

        return () => clearTimeout(timer);
    }, [nodes, edges, activeProfileId, projectId, workflowId]);

    // 5. Stable Handlers - use store's onConnect to keep store in sync
    const onConnect: OnConnect = useCallback(
        (connection: Connection) => useNodeStore.getState().onConnect(connection),
        []
    );

    const onViewportChange = useCallback(
        (vp: { x: number; y: number; zoom: number }) => {
            useNodeStore.getState().setViewport(vp);
        },
        []
    );

    const isValidConnection: IsValidConnection<any> = useCallback((connection) => {
        const { sourceHandle, targetHandle } = connection;
        if (!sourceHandle || !targetHandle) return false;
        const sourceType = sourceHandle.split('-')[1];
        const targetType = targetHandle.split('-')[1];
        return targetType === 'any' || sourceType === 'any' || sourceType === targetType;
    }, []);

    const handleSelectionChange = useCallback(({ nodes: selected }: { nodes: CanvasNode[] }) => {
        const first = selected[0];
        if (first) {
            setSelectedNodeId(first.id);
            setRightInspector(true);
        } else {
            setSelectedNodeId(null);
        }
    }, [setSelectedNodeId, setRightInspector]);

    const handleAddFirstNode = useCallback(() => {
        const viewport = useNodeStore.getState().viewport;
        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
        const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
        const newNode: CanvasNode = {
            id: `ledgerSource-${crypto.randomUUID()}`,
            type: 'ledgerSource',
            position: { x: centerX - 100, y: centerY - 100 },
            data: { label: 'New Ledger Source' }
        };
        useNodeStore.getState().setNodes([...nodes, newNode]);
    }, [nodes]);

    // --- RENDER ---

    if (nodes.length === 0 && !isLoading && loadedWorkflowRef.current === workflowId) {
        return (
            <div className="w-full h-full bg-white dark:bg-zinc-950 relative">
                <EmptyCanvasGuide onAddFirstNode={handleAddFirstNode} />
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={useNodeStore.getState().onNodesChange}
                    onEdgesChange={useNodeStore.getState().onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    className="bg-white dark:bg-zinc-950"
                >
                    <NodeToolbar />
                    <Background color="#3f3f46" gap={20} />
                    <Controls className="bg-gray-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700" />
                </ReactFlow>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white dark:bg-zinc-950 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={useNodeStore.getState().onNodesChange}
                onEdgesChange={useNodeStore.getState().onEdgesChange}
                onConnect={onConnect}
                onViewportChange={onViewportChange}
                onSelectionChange={handleSelectionChange}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                defaultViewport={initialViewport}
                panActivationKeyCode="Space"
                selectionKeyCode="Shift"
                className="bg-white dark:bg-zinc-950"
            >
                <NodeToolbar />
                <Background color="#3f3f46" gap={20} />
                <Controls className="bg-gray-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700" />
                <MiniMap
                    nodeColor="#10b981"
                    maskColor="rgba(24, 24, 27, 0.8)"
                    className="bg-gray-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />
            </ReactFlow>

            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white dark:bg-black/20 backdrop-blur-[2px]">
                    <Card className="bg-gray-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-4 py-2 rounded-lg text-zinc-400 text-sm animate-pulse">
                        <CardContent>
                            Synchronizing Graph...
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
