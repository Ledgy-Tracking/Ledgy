import { Node } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { useErrorStore } from '../../../stores/useErrorStore';

/**
 * Container bounds for layout calculations
 */
export interface ContainerBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

/**
 * Result of group creation
 */
export interface GroupCreationResult {
    container: Node;
    updatedChildren: Node[];
}

/**
 * Calculate bounding box of nodes
 */
export const calculateBoundingBox = (nodes: Node[]): ContainerBounds => {
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);
    const widths = nodes.map(n => (n.width || 150));
    const heights = nodes.map(n => (n.height || 100));
    
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs.map((x, i) => x + widths[i]));
    const maxY = Math.max(...ys.map((y, i) => y + heights[i]));
    
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
};

/**
 * Get default container label based on existing containers
 */
export const getDefaultContainerLabel = (existingNodes: Node[]): string => {
    const containerCount = existingNodes.filter(n => n.type === 'container').length;
    return containerCount === 0 ? 'Group' : `Group ${containerCount + 1}`;
};

/**
 * Validate that nodes can be grouped
 * - Nodes must not already be in a container (no nesting)
 * - All nodes must be at the same nesting level
 */
export const validateGrouping = (
    selectedNodes: Node[],
    _allNodes: Node[]
): { valid: boolean; error?: string } => {
    if (selectedNodes.length < 2) {
        return { valid: false, error: 'Select at least 2 nodes to group' };
    }

    // Check if any node is already in a container (React Flow v12 uses parentId)
    const nodesInContainers = selectedNodes.filter(n => n.parentId !== undefined);
    if (nodesInContainers.length > 0) {
        return { 
            valid: false, 
            error: 'Cannot group: node already in a container' 
        };
    }

    // Check if nodes are from different containers
    const parentIds = new Set(selectedNodes.map(n => n.parentId).filter(Boolean));
    if (parentIds.size > 1) {
        return { 
            valid: false, 
            error: 'Cannot group: nodes from different containers' 
        };
    }

    return { valid: true };
};

/**
 * Create a container node from selected nodes
 * 
 * Algorithm:
 * 1. Validate: Prevent nesting
 * 2. Calculate bounding box with padding
 * 3. Create container node
 * 4. Convert children to relative positions
 */
export const createContainerFromSelection = (
    selectedNodes: Node[],
    existingNodes: Node[],
    label?: string
): GroupCreationResult => {
    const padding = 40;
    
    // Calculate bounding box
    const bounds = calculateBoundingBox(selectedNodes);
    
    // Create container node
    const containerId = `container_${nanoid(6)}`;
    const container: Node = {
        id: containerId,
        type: 'container',
        position: { 
            x: bounds.minX - padding, 
            y: bounds.minY - padding 
        },
        style: {
            width: Math.max(200, bounds.width + padding * 2),
            height: Math.max(150, bounds.height + padding * 2),
        },
        data: {
            type: 'container',
            label: label || getDefaultContainerLabel(existingNodes),
            isCollapsed: false,
            childNodeIds: selectedNodes.map(n => n.id),
            createdAt: new Date().toISOString(),
        },
    };
    
    // Convert children to relative positions
    // React Flow v12 uses parentId instead of parentNode
    const updatedChildren = selectedNodes.map(node => ({
        ...node,
        position: {
            x: node.position.x - container.position.x,
            y: node.position.y - container.position.y,
        },
        parentId: containerId,
        extent: 'parent' as const,  // React Flow native constraint
    }));
    
    return { container, updatedChildren };
};

/**
 * Group nodes into a container
 * Returns the new container or null if validation fails
 */
export const groupNodes = (
    nodeIds: string[],
    allNodes: Node[],
    label?: string
): GroupCreationResult | null => {
    const selectedNodes = allNodes.filter(n => nodeIds.includes(n.id));
    
    const validation = validateGrouping(selectedNodes, allNodes);
    if (!validation.valid) {
        useErrorStore.getState().dispatchError(validation.error || 'Cannot group nodes');
        return null;
    }
    
    return createContainerFromSelection(selectedNodes, allNodes, label);
};

export default groupNodes;
