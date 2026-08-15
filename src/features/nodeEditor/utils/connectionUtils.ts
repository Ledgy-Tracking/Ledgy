import { Edge, Node, Position } from '@xyflow/react';

/**
 * Port position on container edge
 */
export interface PortPosition {
    x: number;
    y: number;
    side: Position;
}

/**
 * Check if a connection is internal (both ends in the same container)
 */
export const isInternalConnection = (
    edge: Edge,
    containerId: string,
    nodes: Node[]
): boolean => {
    const container = nodes.find(n => n.id === containerId);
    if (!container?.data?.childNodeIds) {
        // Fallback: use parentId (React Flow v12)
        // ⚡ Bolt: Replaced chained .filter().map() with single-pass loop
        const childIdsList: string[] = [];
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].parentId === containerId) {
                childIdsList.push(nodes[i].id);
            }
        }
        const childIds = new Set(childIdsList);
        return childIds.has(edge.source) && childIds.has(edge.target);
    }
    
    const rawChildIds = container.data.childNodeIds;
    const childNodeIds: string[] = Array.isArray(rawChildIds) ? rawChildIds : [];
    const childIds = new Set(childNodeIds);
    return childIds.has(edge.source) && childIds.has(edge.target);
};

/**
 * Check if a connection is external (one end in container, one end outside)
 */
export const isExternalConnection = (
    edge: Edge,
    containerId: string,
    nodes: Node[]
): boolean => {
    const container = nodes.find(n => n.id === containerId);
    
    // Get child IDs - prefer data.childNodeIds, fallback to parentId
    let childIds: Set<string>;
    if (container?.data?.childNodeIds) {
        childIds = new Set(container.data.childNodeIds as string[]);
    } else {
        // Fallback: use parentId (React Flow v12)
        // ⚡ Bolt: Replaced chained .filter().map() with single-pass loop
        const childIdsList: string[] = [];
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].parentId === containerId) {
                childIdsList.push(nodes[i].id);
            }
        }
        childIds = new Set(childIdsList);
    }
    
    const sourceIn = childIds.has(edge.source);
    const targetIn = childIds.has(edge.target);
    return (sourceIn && !targetIn) || (!sourceIn && targetIn);
};

/**
 * Get all internal connections for a container
 * Internal connections are calculated dynamically from the edges array
 */
export const getInternalConnections = (
    containerId: string,
    edges: Edge[],
    nodes: Node[]
): Edge[] => {
    const container = nodes.find(n => n.id === containerId);
    
    // Get child IDs - prefer data.childNodeIds, fallback to parentId
    let childIds: Set<string>;
    const rawChildIds = container?.data?.childNodeIds;
    if (Array.isArray(rawChildIds)) {
        childIds = new Set(rawChildIds);
    } else {
        // Fallback: use parentId (React Flow v12)
        // ⚡ Bolt: Replaced chained .filter().map() with single-pass loop
        const childIdsList: string[] = [];
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].parentId === containerId) {
                childIdsList.push(nodes[i].id);
            }
        }
        childIds = new Set(childIdsList);
    }
    
    return edges.filter(
        edge => childIds.has(edge.source) && childIds.has(edge.target)
    );
};

/**
 * Get all external connections for a container
 */
export const getExternalConnections = (
    containerId: string,
    edges: Edge[],
    nodes: Node[]
): Edge[] => {
    return edges.filter(edge => isExternalConnection(edge, containerId, nodes));
};

/**
 * Calculate the position of a port on the container edge
 * based on the internal node's handle position
 */
export const calculateContainerPortPosition = (
    internalNode: Node,
    handleId: string,
    containerBounds: { x: number; y: number; width: number; height: number }
): PortPosition => {
    // Estimate handle position relative to the node
    // This is a simplified calculation - in practice, you'd measure the actual handle position
    const nodeWidth = internalNode.width || 150;
    const nodeHeight = internalNode.height || 100;
    
    // Determine which side the handle is on based on handle ID convention
    // Input handles are typically on the left, outputs on the right
    const isOutput = handleId.startsWith('output') || !handleId.includes('input');
    const isInput = handleId.startsWith('input');
    
    // Calculate relative position within the container
    // internalNode.position is relative to container origin
    const nodeCenterX = internalNode.position.x + nodeWidth / 2;
    const nodeCenterY = internalNode.position.y + nodeHeight / 2;
    
    // Determine which container edge the port should be on
    const containerWidth = containerBounds.width;
    const containerHeight = containerBounds.height;
    
    // Normalize position to 0-1 range
    const normalizedX = nodeCenterX / containerWidth;
    const normalizedY = nodeCenterY / containerHeight;
    
    // Determine which side of the container to place the port
    let side: Position;
    let x = 0;
    let y = 0;
    
    if (isOutput) {
        // Output ports go on the right side
        side = Position.Right;
        x = containerWidth;
        y = Math.max(8, Math.min(containerHeight - 8, nodeCenterY));
    } else if (isInput) {
        // Input ports go on the left side
        side = Position.Left;
        x = 0;
        y = Math.max(8, Math.min(containerHeight - 8, nodeCenterY));
    } else {
        // Default: place based on node position within container
        if (normalizedX < 0.3) {
            side = Position.Left;
            x = 0;
            y = Math.max(8, Math.min(containerHeight - 8, nodeCenterY));
        } else if (normalizedX > 0.7) {
            side = Position.Right;
            x = containerWidth;
            y = Math.max(8, Math.min(containerHeight - 8, nodeCenterY));
        } else if (normalizedY < 0.5) {
            side = Position.Top;
            y = 0;
            x = Math.max(8, Math.min(containerWidth - 8, nodeCenterX));
        } else {
            side = Position.Bottom;
            y = containerHeight;
            x = Math.max(8, Math.min(containerWidth - 8, nodeCenterX));
        }
    }
    
    return { x, y, side };
};

/**
 * Get all container IDs that a node belongs to
 * (for validation and traversal)
 */
export const getContainerChain = (
    nodeId: string,
    nodes: Node[]
): string[] => {
    const chain: string[] = [];
    let currentId: string | undefined = nodeId;
    
    while (currentId) {
        const node = nodes.find(n => n.id === currentId);
        if (node?.parentId) {
            chain.push(node.parentId);
            currentId = node.parentId;
        } else {
            break;
        }
    }
    
    return chain;
};

/**
 * Check if adding a container as a child would create a circular reference
 */
export const wouldCreateCircularReference = (
    containerId: string,
    potentialParentId: string,
    nodes: Node[]
): boolean => {
    // Check if potentialParentId is already a descendant of containerId
    const descendants = getAllDescendants(containerId, nodes);
    return descendants.includes(potentialParentId);
};

/**
 * Get all descendant node IDs (recursive)
 */
const getAllDescendants = (
    containerId: string,
    nodes: Node[]
): string[] => {
    // React Flow v12 uses parentId
    // ⚡ Bolt: Replaced chained .filter().map() with single-pass loop
    const directChildren: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].parentId === containerId) {
            directChildren.push(nodes[i].id);
        }
    }
    
    const allDescendants = [...directChildren];
    
    for (const childId of directChildren) {
        const childDescendants = getAllDescendants(childId, nodes);
        allDescendants.push(...childDescendants);
    }
    
    return allDescendants;
};

export default {
    isInternalConnection,
    isExternalConnection,
    getInternalConnections,
    getExternalConnections,
    calculateContainerPortPosition,
    getContainerChain,
    wouldCreateCircularReference,
};
