import { Node, Edge } from '@xyflow/react';

/**
 * Container integrity validation result
 */
export interface IntegrityValidationResult {
    valid: boolean;
    errors: string[];
    repaired: Node[];
}

/**
 * Validate container data integrity
 * 
 * Checks:
 * 1. Orphaned children (parentId references deleted container)
 * 2. Missing children (child IDs in container but not in nodes)
 * 3. Circular parent references
 * 4. Invalid container data structure
 */
export const validateContainerIntegrity = (
    nodes: Node[],
    _edges: Edge[]
): IntegrityValidationResult => {
    const errors: string[] = [];
    let repaired = [...nodes];
    
    // Pre-compute maps for O(1) lookups
    const nodesMap = new Map<string, Node>();
    const nodesByParentIdMap = new Map<string, Node[]>();
    const nodeIndexMap = new Map<string, number>();
    const repairedMap = new Map<string, Node>();

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        nodesMap.set(node.id, node);
        repairedMap.set(node.id, node);
        nodeIndexMap.set(node.id, i);

        if (node.parentId) {
            if (!nodesByParentIdMap.has(node.parentId)) {
                nodesByParentIdMap.set(node.parentId, []);
            }
            nodesByParentIdMap.get(node.parentId)!.push(node);
        }
    }

    // Helper to safely update both array and map
    const updateRepairedNode = (nodeId: string, updatedNode: Node) => {
        const index = nodeIndexMap.get(nodeId);
        if (index !== undefined) {
            repaired[index] = updatedNode;
            repairedMap.set(nodeId, updatedNode);
        }
    };

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    for (let index = 0; index < repaired.length; index++) {
        const node = repaired[index];
        if (node.parentId) {
            const parent = nodesMap.get(node.parentId);
            if (!parent) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                updateRepairedNode(node.id, rest as Node);
            }
        }
    }
    
    // 2. Validate container child references
    for (let index = 0; index < repaired.length; index++) {
        const node = repaired[index];
        if (node.type === 'container' && node.data?.childNodeIds) {
            const rawChildIds = node.data.childNodeIds;
            const childNodeIds: string[] = Array.isArray(rawChildIds) ? rawChildIds : [];
            const missingChildren: string[] = [];

            for (let i = 0; i < childNodeIds.length; i++) {
                if (!nodesMap.has(childNodeIds[i])) {
                    missingChildren.push(childNodeIds[i]);
                }
            }
            
            if (missingChildren.length > 0) {
                errors.push(`Container ${node.id} references missing children: ${missingChildren.join(', ')}`);
                // Auto-repair: remove missing child IDs
                const missingSet = new Set(missingChildren);
                updateRepairedNode(node.id, {
                    ...node,
                    data: {
                        ...node.data,
                        childNodeIds: childNodeIds.filter(id => !missingSet.has(id)),
                    },
                });
            }
            
            // Check that all children actually reference this container (using parentId)
            const misparentedChildren: Node[] = [];
            for (let i = 0; i < childNodeIds.length; i++) {
                const childNode = nodesMap.get(childNodeIds[i]);
                if (childNode && childNode.parentId !== node.id) {
                    misparentedChildren.push(childNode);
                }
            }

            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);
                // Auto-repair: fix parentId on children
                for (let i = 0; i < misparentedChildren.length; i++) {
                    const child = misparentedChildren[i];
                    const repairedChild = repairedMap.get(child.id) || child;
                    updateRepairedNode(child.id, { ...repairedChild, parentId: node.id, extent: 'parent' as const });
                }
            }
        }
    }
    
    // 3. Prevent circular references
    const hasCircularRef = (nodeId: string, visited = new Set<string>()): boolean => {
        if (visited.has(nodeId)) return true;
        visited.add(nodeId);
        const node = repairedMap.get(nodeId);
        if (node?.parentId) {
            return hasCircularRef(node.parentId, visited);
        }
        return false;
    };
    
    for (let i = 0; i < repaired.length; i++) {
        const node = repaired[i];
        if (node.parentId && hasCircularRef(node.id)) {
            errors.push(`Circular reference detected: ${node.id}`);
            // Auto-repair: clear parentId
            const { parentId: _, extent: __, ...rest } = node;
            updateRepairedNode(node.id, rest as Node);
        }
    }
    
    // 4. Validate container data structure
    for (let index = 0; index < repaired.length; index++) {
        const node = repaired[index];
        if (node.type === 'container') {
            const data = node.data;
            if (!data || typeof data !== 'object') {
                errors.push(`Container ${node.id} has invalid data structure`);
                // Auto-repair: set default data
                const children = nodesByParentIdMap.get(node.id) || [];
                updateRepairedNode(node.id, {
                    ...node,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: children.map(n => n.id),
                        createdAt: new Date().toISOString(),
                    },
                });
            } else if (data.type !== 'container') {
                errors.push(`Container ${node.id} has incorrect type discriminator`);
                // Auto-repair: fix type discriminator
                updateRepairedNode(node.id, {
                    ...node,
                    data: { ...data, type: 'container' },
                });
            }
        }
    }
    
    return { valid: errors.length === 0, errors, repaired };
};

/**
 * Repair container integrity issues
 * Returns repaired nodes array
 */
export const repairContainerIntegrity = (
    nodes: Node[],
    edges: Edge[]
): Node[] => {
    const { repaired } = validateContainerIntegrity(nodes, edges);
    return repaired;
};

export default validateContainerIntegrity;
