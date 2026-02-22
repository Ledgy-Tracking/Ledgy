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

export const NodeCanvas: React.FC = () => {
    const { activeProfileId } = useProfileStore();
    const { nodes, edges, viewport, loadCanvas, saveCanvas, setNodes, setEdges, setViewport } = useNodeStore();

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

    // Load canvas on mount
    useEffect(() => {
        if (activeProfileId) {
            loadCanvas(activeProfileId, 'default');
        }
    }, [activeProfileId, loadCanvas]);

    // Auto-save on changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeProfileId && rfNodes.length > 0 || rfEdges.length > 0) {
                saveCanvas(activeProfileId, 'default');
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [rfNodes, rfEdges, activeProfileId, saveCanvas]);

    const onConnect = useCallback(
        (params: Connection) => {
            const newEdge: Edge = {
                ...params,
                id: `edge-${params.source}-${params.target}`,
                type: 'default',
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

    // Sync React Flow state with store
    useEffect(() => {
        setRfNodes(nodes as Node[]);
    }, [nodes, setRfNodes]);

    useEffect(() => {
        setRfEdges(edges);
    }, [edges, setRfEdges]);

    // Show empty state guide when no nodes
    if (nodes.length === 0 && edges.length === 0) {
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
                    fitView
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
                viewport={viewport}
                fitView
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
