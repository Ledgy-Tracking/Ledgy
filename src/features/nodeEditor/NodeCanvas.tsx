import React, { useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeStore } from '../../stores/useNodeStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { EmptyCanvasGuide } from './EmptyCanvasGuide';
import { LedgerSourceNode } from './nodes/LedgerSourceNode';
import { CorrelationNode } from './nodes/CorrelationNode';
import { ArithmeticNode } from './nodes/ArithmeticNode';
import { TriggerNode } from './nodes/TriggerNode';
import { DashboardOutputNode } from './nodes/DashboardOutputNode';
import { DataEdge } from './edges/DataEdge';

// Custom node types
const nodeTypes = {
    ledgerSource: LedgerSourceNode,
    correlation: CorrelationNode,
    arithmetic: ArithmeticNode,
    trigger: TriggerNode,
    dashboardOutput: DashboardOutputNode,
};

// Custom edge types
const edgeTypes = {
    data: DataEdge,
};

export const NodeCanvas: React.FC = () => {
    const { activeProfileId } = useProfileStore();
    const { nodes, edges, viewport, isLoading, loadCanvas, saveCanvas, setNodes, setEdges, setViewport } = useNodeStore();

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

    // Sync React Flow changes back to Zustand store for persistence
    useEffect(() => {
        setNodes(rfNodes as any);
    }, [rfNodes, setNodes]);

    useEffect(() => {
        setEdges(rfEdges as any);
    }, [rfEdges, setEdges]);

    // Load canvas on mount
    useEffect(() => {
        if (activeProfileId) {
            loadCanvas(activeProfileId, 'default');
        }
    }, [activeProfileId, loadCanvas]);

    // Auto-save on changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeProfileId && (nodes.length > 0 || edges.length > 0)) {
                saveCanvas(activeProfileId, 'default');
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [nodes, edges, activeProfileId, saveCanvas]);

    const onConnect = useCallback(
        (params: Connection) => {
            // Extract data type from source handle
            const dataType = params.sourceHandle?.split('-')[1] || 'unknown';
            
            const newEdge: Edge = {
                ...params,
                id: `edge-${params.source}-${params.target}-${params.sourceHandle}-${params.targetHandle}`,
                type: 'data',
                data: {
                    dataType,
                    sampleData: `${dataType} flow`,
                },
            };
            setRfEdges((eds) => addEdge(newEdge, eds));
        },
        [setRfEdges]
    );

    const onViewportChange = useCallback(
        (vp: { x: number; y: number; zoom: number }) => {
            setViewport(vp);
        },
        [setViewport]
    );

    const isValidConnection = useCallback((connection: Connection) => {
        const sourceHandle = connection.sourceHandle;
        const targetHandle = connection.targetHandle;

        if (!sourceHandle || !targetHandle) return false;

        // IDs are formatted as source-{type}-{name} or target-{type}-{name}
        const sourceType = sourceHandle.split('-')[1];
        const targetType = targetHandle.split('-')[1];

        // "any" is a wildcard
        if (targetType === 'any' || sourceType === 'any') return true;

        return sourceType === targetType;
    }, []);

    // Initial sync from store to React Flow state
    useEffect(() => {
        if (rfNodes.length === 0 && nodes.length > 0) {
            setRfNodes(nodes as Node[]);
        }
    }, [nodes, setRfNodes, rfNodes.length]);

    useEffect(() => {
        if (rfEdges.length === 0 && edges.length > 0) {
            setRfEdges(edges);
        }
    }, [edges, setRfEdges, rfEdges.length]);

    // Show empty state guide when no nodes
    if (nodes.length === 0 && edges.length === 0 && !isLoading) {
        return (
            <div className="w-full h-full bg-zinc-950 relative">
                <EmptyCanvasGuide />
                <ReactFlow
                    nodes={[]}
                    edges={[]}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onViewportChange={onViewportChange}
                    isValidConnection={isValidConnection}
                    panActivationKeyCode="Space"
                    selectionKeyCode="Shift"
                    fitView
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={{ type: 'data' }}
                    className="bg-zinc-950"
                >
                    <Background color="#3f3f46" gap={20} />
                    <Controls className="bg-zinc-800 border-zinc-700" />
                    <MiniMap
                        nodeColor="#10b981"
                        maskColor="rgba(24, 24, 27, 0.8)"
                        className="bg-zinc-900 border-zinc-800"
                    />
                </ReactFlow>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-zinc-950">
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onViewportChange={onViewportChange}
                isValidConnection={isValidConnection}
                defaultViewport={viewport}
                panActivationKeyCode="Space"
                selectionKeyCode="Shift"
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{ type: 'data' }}
                className="bg-zinc-950"
            >
                <Background color="#3f3f46" gap={20} />
                <Controls className="bg-zinc-800 border-zinc-700" />
                <MiniMap
                    nodeColor="#10b981"
                    maskColor="rgba(24, 24, 27, 0.8)"
                    className="bg-zinc-900 border-zinc-800"
                />
            </ReactFlow>
        </div>
    );
};
