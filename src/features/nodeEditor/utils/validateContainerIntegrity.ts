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
    
    const nodesById = new Map<string, Node>();
    for (let i = 0; i < nodes.length; i++) {
        nodesById.set(nodes[i].id, nodes[i]);
    }

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    for (let index = 0; index < repaired.length; index++) {
        const node = repaired[index];
        if (node.parentId) {
            const parent = nodesById.get(node.parentId);
            if (!parent) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                repaired[index] = rest as Node;
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
                if (!nodesById.has(childNodeIds[i])) {
                    missingChildren.push(childNodeIds[i]);
                }
            }
            
            if (missingChildren.length > 0) {
                errors.push(`Container ${node.id} references missing children: ${missingChildren.join(', ')}`);
                // Auto-repair: remove missing child IDs
                const missingSet = new Set(missingChildren);
                repaired[index] = {
                    ...node,
                    data: {
                        ...node.data,
                        childNodeIds: childNodeIds.filter(id => !missingSet.has(id)),
                    },
                };
            }
            
            // Check that all children actually reference this container (using parentId)
            const misparentedSet = new Set<string>();
            for (let i = 0; i < childNodeIds.length; i++) {
                const childId = childNodeIds[i];
                const childNode = nodesById.get(childId);
                if (childNode && childNode.parentId !== node.id) {
                    misparentedSet.add(childId);
                }
            }

            if (misparentedSet.size > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${Array.from(misparentedSet).join(', ')}`);
                // Auto-repair: fix parentId on children
                for (let i = 0; i < repaired.length; i++) {
                    if (misparentedSet.has(repaired[i].id)) {
                        repaired[i] = { ...repaired[i], parentId: node.id, extent: 'parent' as const };
                    }
                }
            }
        }
    }
    
    // Since repaired can be mutated, let's create a map for it
    const repairedById = new Map<string, Node>();
    for (let i = 0; i < repaired.length; i++) {
        repairedById.set(repaired[i].id, repaired[i]);
    }

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
    
    for (let index = 0; index < repaired.length; index++) {
        const node = repaired[index];
        if (node.parentId && hasCircularRef(node.id)) {
            errors.push(`Circular reference detected: ${node.id}`);
            // Auto-repair: clear parentId
            const { parentId: _, extent: __, ...rest } = node;
            repaired[index] = rest as Node;
            repairedById.set(node.id, repaired[index]); // Update the map cache
        }
    }
    
    // 4. Validate container data structure
    for (let index = 0; index < repaired.length; index++) {
        const node = repaired[index];
        if (node.type === 'container') {
            const data = node.data;
            if (!data || typeof data !== 'object') {
                errors.push(`Container ${node.id} has invalid data structure`);

                const childIds: string[] = [];
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].parentId === node.id) {
                        childIds.push(nodes[i].id);
                    }
                }

                // Auto-repair: set default data
                repaired[index] = {
                    ...node,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: childIds,
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
