import { Node } from '@xyflow/react';

/**
 * Result of ungroup operation
 */
export interface UngroupResult {
    /** Nodes with restored absolute positions and parentId removed */
    restoredNodes: Node[];
    /** IDs of nodes that were children of the container */
    childNodeIds: string[];
}

/**
 * Convert relative positions to absolute positions for ungrouping
 */
export const convertToAbsolutePositions = (
    container: Node,
    children: Node[]
): Node[] => {
    return children.map(child => ({
        ...child,
        position: {
            x: container.position.x + child.position.x,
            y: container.position.y + child.position.y,
        },
        parentId: undefined,
        // Remove extent constraint
        extent: undefined,
    }));
};

/**
 * Ungroup a container node
 * 
 * Algorithm:
 * 1. Find the container node
 * 2. Find all child nodes (using parentId in React Flow v12)
 * 3. Convert child positions from relative to absolute
 * 4. Remove parentId reference from children
 * 5. Return restored children (container should be removed by caller)
 */
export const ungroupNodes = (
    containerId: string,
    allNodes: Node[]
): UngroupResult | null => {
    const container = allNodes.find(n => n.id === containerId);
    
    if (!container) {
        return null;
    }
    
    if (container.type !== 'container') {
        return null;
    }
    
    // Get child IDs from container data
    const rawChildIds = container.data?.childNodeIds;
    const childNodeIds: string[] = Array.isArray(rawChildIds) ? rawChildIds : [];
    
    // Find child nodes (using parentId in React Flow v12)
    const children = allNodes.filter(n => 
        childNodeIds.includes(n.id) || n.parentId === containerId
    );
    
    if (children.length === 0) {
        // No children found, just return empty result
        return { restoredNodes: [], childNodeIds: [] };
    }
    
    // Convert to absolute positions
    const restoredNodes = convertToAbsolutePositions(container, children);
    
    return { restoredNodes, childNodeIds };
};

/**
 * Get all descendant nodes (for nested containers - future use)
 * Currently only handles one level since nesting is not allowed
 */
export const getContainerChildren = (
    containerId: string,
    allNodes: Node[]
): Node[] => {
    // React Flow v12 uses parentId instead of parentNode
    return allNodes.filter(n => n.parentId === containerId);
};

export default ungroupNodes;
