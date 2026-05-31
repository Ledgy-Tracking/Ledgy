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
    
    // Pre-index nodes for O(1) lookups
    const nodesById = new Map<string, Node>();
    for (let i = 0; i < nodes.length; i++) {
        nodesById.set(nodes[i].id, nodes[i]);
    }

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            const parent = nodesById.get(node.parentId);
            if (!parent) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                repaired[index] = rest as Node;
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
                repaired[index] = {
                    ...node,
                    data: {
                        ...node.data,
                        childNodeIds: childNodeIds.filter(
                            id => !missingChildren.includes(id)
                        ),
                    },
                };
            }
            
            // Check that all children actually reference this container (using parentId)
            const misparentedChildrenIds = new Set<string>();
            for (let i = 0; i < childNodeIds.length; i++) {
                const childId = childNodeIds[i];
                const childNode = nodesById.get(childId);
                if (childNode && childNode.parentId !== node.id) {
                    misparentedChildrenIds.add(childId);
                }
            }

            if (misparentedChildrenIds.size > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${Array.from(misparentedChildrenIds).join(', ')}`);
                // Auto-repair: fix parentId on children
                repaired = repaired.map(n => {
                    if (misparentedChildrenIds.has(n.id)) {
                        return { ...n, parentId: node.id, extent: 'parent' as const };
                    }
                    return n;
                });
            }
        }
    });
    
    // 3. Prevent circular references
    const repairedById = new Map<string, Node>();
    for (let i = 0; i < repaired.length; i++) {
        repairedById.set(repaired[i].id, repaired[i]);
    }
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
                repaired[index] = rest as Node;
                repairedById.set(rest.id, rest as Node);
            }
        }
    });
    
    // 4. Validate container data structure
    repaired.forEach((node, index) => {
        if (node.type === 'container') {
            const data = node.data;
            if (!data || typeof data !== 'object') {
                errors.push(`Container ${node.id} has invalid data structure`);
                // ⚡ Bolt: Replace chained .filter().map() with single-pass loop
                const validChildNodeIds: string[] = [];
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].parentId === node.id) {
                        validChildNodeIds.push(nodes[i].id);
                    }
                }
                // Auto-repair: set default data
                repaired[index] = {
                    ...node,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: validChildNodeIds,
                        createdAt: new Date().toISOString(),
                    },
                };
            } else if (data.type !== 'container') {
                errors.push(`Container ${node.id} has incorrect type discriminator`);
                // Auto-repair: fix type discriminator
                repaired[index] = {
                    ...node,
                    data: { ...data, type: 'container' },
                };
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
