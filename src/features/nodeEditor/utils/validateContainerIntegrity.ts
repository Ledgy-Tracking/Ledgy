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
    
    // ⚡ Bolt: Use Map for O(1) lookups to avoid O(N^2) complexity during validation and repair loops
    const nodesById = new Map<string, Node>();
    nodes.forEach(n => nodesById.set(n.id, n));

    const repairedById = new Map<string, Node>();
    repaired.forEach(n => repairedById.set(n.id, n));

    // Helper to keep both array and Map in sync when mutating nodes
    const updateRepairedNode = (index: number, updatedNode: Node) => {
        repaired[index] = updatedNode;
        repairedById.set(updatedNode.id, updatedNode);
    };

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            const parent = nodesById.get(node.parentId);
            if (!parent) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                updateRepairedNode(index, rest as Node);
            }
        }
    });
    
    // 2. Validate container child references
    repaired.forEach((node, index) => {
        if (node.type === 'container' && node.data?.childNodeIds) {
            const rawChildIds = node.data.childNodeIds;
            const childNodeIds: string[] = Array.isArray(rawChildIds) ? rawChildIds : [];
            const missingChildren = childNodeIds.filter(
                childId => !nodesById.has(childId)
            );
            
            if (missingChildren.length > 0) {
                errors.push(`Container ${node.id} references missing children: ${missingChildren.join(', ')}`);
                // Auto-repair: remove missing child IDs
                updateRepairedNode(index, {
                    ...node,
                    data: {
                        ...node.data,
                        childNodeIds: childNodeIds.filter(
                            id => !missingChildren.includes(id)
                        ),
                    },
                });
            }
            
            // Check that all children actually reference this container (using parentId)
            const children = childNodeIds.map(id => nodesById.get(id)).filter((n): n is Node => n !== undefined);
            const misparentedChildren = children.filter(n => n.parentId !== node.id);
            const misparentedSet = new Set(misparentedChildren.map(n => n.id));
            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);
                // Auto-repair: fix parentId on children
                repaired = repaired.map(n => {
                    if (misparentedSet.has(n.id)) {
                        const updated = { ...n, parentId: node.id, extent: 'parent' as const };
                        repairedById.set(updated.id, updated);
                        return updated;
                    }
                    return n;
                });
            }
        }
    });
    
    // 3. Prevent circular references
    const hasCircularRef = (nodeId: string, visited = new Set<string>()): boolean => {
        if (visited.has(nodeId)) return true;
        visited.add(nodeId);
        const node = repairedById.get(nodeId);
        if (node?.parentId) {
            return hasCircularRef(node.parentId, visited);
        }
        return false;
    };
    
    repaired.forEach(node => {
        if (node.parentId && hasCircularRef(node.id)) {
            errors.push(`Circular reference detected: ${node.id}`);
            // Auto-repair: clear parentId
            const index = repaired.findIndex(n => n.id === node.id);
            if (index !== -1) {
                const { parentId: _, extent: __, ...rest } = node;
                updateRepairedNode(index, rest as Node);
            }
        }
    });
    
    // 4. Validate container data structure
    repaired.forEach((node, index) => {
        if (node.type === 'container') {
            const data = node.data;
            if (!data || typeof data !== 'object') {
                errors.push(`Container ${node.id} has invalid data structure`);
                // Auto-repair: set default data
                const childIds: string[] = [];
                for (const potentialChild of nodes) {
                    if (potentialChild.parentId === node.id) {
                        childIds.push(potentialChild.id);
                    }
                }

                updateRepairedNode(index, {
                    ...node,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: childIds,
                        createdAt: new Date().toISOString(),
                    },
                });
            } else if (data.type !== 'container') {
                errors.push(`Container ${node.id} has incorrect type discriminator`);
                // Auto-repair: fix type discriminator
                updateRepairedNode(index, {
                    ...node,
                    data: { ...data, type: 'container' },
                });
            }
        }
    });
    
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
