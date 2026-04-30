import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeProps, Handle, Position, useReactFlow } from '@xyflow/react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { useContainerState } from '../hooks/useContainerState';
import { portColorMap } from '../utils/portColors';
import { isExternalConnection, calculateContainerPortPosition } from '../utils/connectionUtils';
import '../styles/containerAnimations.css';

/**
 * Container Node Data Structure
 */
export interface ContainerNodeData {
    type: 'container';
    label: string;
    isCollapsed: boolean;
    childNodeIds: string[];
    createdAt: string;
}

/**
 * Runtime type guard for ContainerNodeData
 */
function isValidContainerNodeData(data: unknown): data is ContainerNodeData {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
        d.type === 'container' &&
        typeof d.label === 'string' &&
        typeof d.isCollapsed === 'boolean' &&
        Array.isArray(d.childNodeIds) &&
        typeof d.createdAt === 'string'
    );
}

/**
 * Container Node - Groups multiple nodes into a collapsible container
 * Story 4.9: Sub-Graph Container Grouping
 * 
 * Features:
 * - Expandable/collapsible with animation
 * - Inline editable label
 * - External connection ports when collapsed
 * - Selection highlighting
 * - Keyboard accessible (Space to toggle)
 */
export const ContainerNode: React.FC<NodeProps> = React.memo(({ 
    id, 
    data, 
    selected,
    width = 200,
    height = 150,
}) => {
    const { toggleContainer, setContainerLabel } = useContainerState();
    const { getNodes, getEdges } = useReactFlow();
    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    // Runtime type validation with fallback
    const nodeData = isValidContainerNodeData(data) ? data : {
        type: 'container' as const,
        label: 'Group',
        isCollapsed: false,
        childNodeIds: [],
        createdAt: new Date().toISOString(),
    };

    const { label, isCollapsed, childNodeIds } = nodeData;

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Handle expand/collapse toggle
    const handleToggle = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        toggleContainer(id);
    }, [id, toggleContainer]);

    // Handle header double-click to toggle
    const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        toggleContainer(id);
    }, [id, toggleContainer]);

    // Handle keyboard toggle (Space key)
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            toggleContainer(id);
        }
    }, [id, toggleContainer]);

    // Start editing label
    const startEditing = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setEditLabel(label);
        setIsEditing(true);
    }, [label]);

    // Save label edit
    const saveLabel = useCallback(() => {
        if (editLabel.trim()) {
            setContainerLabel(id, editLabel.trim());
        }
        setIsEditing(false);
    }, [id, editLabel, setContainerLabel]);

    // Cancel label edit
    const cancelEdit = useCallback(() => {
        setIsEditing(false);
    }, []);

    // Handle input keydown
    const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveLabel();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    }, [saveLabel, cancelEdit]);

    // Calculate external ports for collapsed state
    const externalPorts = React.useMemo(() => {
        if (!isCollapsed) return [];
        
        const nodes = getNodes();
        const edges = getEdges();
        const childIds = new Set(childNodeIds);
        
        // Find all external edges (one end in container, one end outside)
        const externalEdges = edges.filter(edge => 
            isExternalConnection(edge, id, nodes)
        );
        
        // Calculate port positions for each external edge
        return externalEdges.map(edge => {
            const isSourceInContainer = childIds.has(edge.source);
            const internalNodeId = isSourceInContainer ? edge.source : edge.target;
            const internalHandleId = isSourceInContainer ? edge.sourceHandle : edge.targetHandle;
            const internalNode = nodes.find(n => n.id === internalNodeId);
            
            if (!internalNode || !internalHandleId) return null;
            
            const position = calculateContainerPortPosition(
                internalNode,
                internalHandleId,
                { x: 0, y: 0, width: width || 200, height: height || 150 }
            );
            
            // Extract type from handle ID (e.g., "input-number" or "output")
            const handleType = internalHandleId.includes('number') ? 'number' :
                              internalHandleId.includes('string') ? 'string' :
                              internalHandleId.includes('boolean') ? 'boolean' :
                              internalHandleId.includes('date') ? 'date' :
                              internalHandleId.includes('array') ? 'number[]' : 'any';
            
            return {
                id: `${edge.id}-port`,
                position,
                type: isSourceInContainer ? 'source' : 'target',
                handleId: internalHandleId,
                nodeId: internalNodeId,
                dataType: handleType,
                edge,
            };
        }).filter(Boolean);
    }, [isCollapsed, childNodeIds, getNodes, getEdges, id, width, height]);

    return (
        <div
            className={`container-node ${isCollapsed ? 'collapsed' : 'expanded'} ${selected ? 'selected' : ''}`}
            style={{
                width: width || 200,
                height: isCollapsed ? 40 : (height || 150),
            }}
        >
            {/* Container Body */}
            <div 
                className={`
                    w-full h-full rounded-lg border-2 overflow-hidden
                    ${selected ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-700'}
                    bg-gray-50 dark:bg-zinc-900/50
                    transition-colors duration-150
                `}
            >
                {/* Header */}
                <div
                    ref={headerRef}
                    className="container-header flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 cursor-pointer"
                    onDoubleClick={handleHeaderDoubleClick}
                    onClick={isEditing ? undefined : startEditing}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-expanded={!isCollapsed}
                    aria-label={`Group: ${label}`}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FolderOpen size={14} className="text-zinc-400 flex-shrink-0" />
                        
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onBlur={saveLabel}
                                onKeyDown={handleInputKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-zinc-700 text-zinc-100 text-sm px-1 py-0.5 rounded border border-emerald-500 outline-none min-w-0"
                                maxLength={50}
                            />
                        ) : (
                            <span className="text-sm font-medium text-zinc-100 truncate">
                                {label}
                            </span>
                        )}
                    </div>
                    
                    {/* Collapse/Expand Button */}
                    <button
                        onClick={handleToggle}
                        className="p-1 rounded hover:bg-zinc-700 transition-colors flex-shrink-0"
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        <ChevronDown 
                            size={16} 
                            className={`chevron-icon ${isCollapsed ? 'collapsed' : 'expanded'} text-zinc-400`}
                        />
                    </button>
                </div>

                {/* External Ports (only when collapsed) */}
                {isCollapsed && externalPorts.length > 0 && (
                    <div className="relative w-full h-full">
                        {externalPorts.map((port) => port && (
                            <Handle
                                key={port.id}
                                type={port.type as 'source' | 'target'}
                                position={port.position.side as Position}
                                id={port.handleId}
                                className="!w-3 !h-3 !border-2 !border-zinc-900 transition-transform hover:scale-125"
                                style={{
                                    left: port.position.x,
                                    top: port.position.y,
                                    backgroundColor: portColorMap[port.dataType as keyof typeof portColorMap] || portColorMap.any,
                                }}
                                aria-label={`${port.type} port for ${port.handleId}`}
                            />
                        ))}
                    </div>
                )}

                {/* Child Count Indicator (when collapsed) */}
                {isCollapsed && (
                    <div className="absolute bottom-1 right-2 text-xs text-zinc-500">
                        {childNodeIds.length} {childNodeIds.length === 1 ? 'node' : 'nodes'}
                    </div>
                )}
            </div>
        </div>
    );
});

ContainerNode.displayName = 'ContainerNode';

export default ContainerNode;
