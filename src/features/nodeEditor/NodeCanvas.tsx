import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    IsValidConnection,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    OnConnect,
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
 * Stability Fixes:
 * 1. Moved all object/array literals outside the component.
 * 2. Used useNodesState for local rendering state (controlled mode).
 * 3. Memoized all callbacks passed to ReactFlow.
 * 4. Precised Zustand selectors to avoid whole-store re-renders.
 * 5. Added debug logging (visible in dev console).
 */
export const NodeCanvas: React.FC = () => {
    // 1. Precise selectors for stable dependencies
    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const { projectId } = useParams<{ projectId: string }>();

    // UI Store actions - use stable selectors
    const setSelectedNodeId = useUIStore(s => s.setSelectedNodeId);
    const setRightInspector = useUIStore(s => s.setRightInspector);

    // Node Store - only subscribe to isLoading for the overlay
    const isLoading = useNodeStore(s => s.isLoading);
    const initialViewport = useMemo(() => useNodeStore.getState().viewport, []);

    // 2. React Flow State (Local ownership)
    const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const loadedRef = useRef(false);
    const renderCountRef = useRef(0);
    renderCountRef.current++;

    // DEBUG: Log renders to catch loops early
    if (renderCountRef.current % 50 === 0) {
        console.warn(`[NodeCanvas] High render count detected: ${renderCountRef.current}. Nodes: ${rfNodes.length}`);
    }

    // 3. Initial Load (One-time)
    useEffect(() => {
        if (!activeProfileId || !projectId || loadedRef.current) return;

        console.log('[NodeCanvas] Initial load triggered');
        loadedRef.current = true;

        useNodeStore.getState().loadCanvas(activeProfileId, projectId).then(() => {
            const { nodes, edges } = useNodeStore.getState();
            setRfNodes(nodes as unknown as Node[]);
            setRfEdges(edges as unknown as Edge[]);
        });
    }, [activeProfileId, projectId, setRfNodes, setRfEdges]);

    // 4. Debounced Save
    useEffect(() => {
        if (!loadedRef.current || !activeProfileId || !projectId) return;

        const timer = setTimeout(() => {
            useNodeStore.getState().saveCanvas(
                activeProfileId,
                projectId,
                rfNodes as unknown as CanvasNode[],
                rfEdges as any
            );
        }, 3000); // 3s debounce for stability

        return () => clearTimeout(timer);
    }, [rfNodes, rfEdges, activeProfileId, projectId]);

    // 5. Stable Handlers
    const onConnect: OnConnect = useCallback(
        (connection: Connection) => setRfEdges((eds) => addEdge(connection, eds)),
        [setRfEdges]
    );

    const onViewportChange = useCallback(
        (vp: { x: number; y: number; zoom: number }) => {
            // Passive update - don't trigger re-render of this component
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

    const handleSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
        const first = selected[0];
        if (first) {
            setSelectedNodeId(first.id);
            setRightInspector(true);
        } else {
            setSelectedNodeId(null);
        }
    }, [setSelectedNodeId, setRightInspector]);

    const handleAddFirstNode = useCallback(() => {
        const newNode: Node = {
            id: `ledgerSource-${Date.now()}`,
            type: 'ledgerSource',
            position: { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 },
            data: { label: 'New Ledger Source' }
        };
        setRfNodes((nds) => [...nds, newNode]);
    }, [setRfNodes]);

    // --- RENDER ---

    if (rfNodes.length === 0 && !isLoading && loadedRef.current) {
        return (
            <div className="w-full h-full bg-zinc-950 relative">
                <EmptyCanvasGuide onAddFirstNode={handleAddFirstNode} />
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    className="bg-zinc-950"
                >
                    <NodeToolbar />
                    <Background color="#3f3f46" gap={20} />
                    <Controls className="bg-zinc-800 border-zinc-700" />
                </ReactFlow>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-zinc-950 relative">
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
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
                className="bg-zinc-950"
            >
                <NodeToolbar />
                <Background color="#3f3f46" gap={20} />
                <Controls className="bg-zinc-800 border-zinc-700" />
                <MiniMap
                    nodeColor="#10b981"
                    maskColor="rgba(24, 24, 27, 0.8)"
                    className="bg-zinc-900 border-zinc-800"
                />
            </ReactFlow>

            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-lg text-zinc-400 text-sm animate-pulse">
                        Synchronizing Graph...
                    </div>
                </div>
            )}
        </div>
    );
};
