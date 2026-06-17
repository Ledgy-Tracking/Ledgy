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
    
    // ⚡ Bolt: Pre-index nodes to avoid O(N^2) array.find/filter lookups
    const nodesById = new Map<string, Node>(nodes.map(n => [n.id, n]));

    // Create a map of index positions to avoid slow findIndex later and for direct array mutation
    const nodeIndexById = new Map<string, number>(repaired.map((n, i) => [n.id, i]));

    // Maintain a map of the current repaired state to avoid finding stale node data
    const repairedById = new Map<string, Node>(repaired.map(n => [n.id, n]));

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            if (!nodesById.has(node.parentId)) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                repaired[index] = rest as Node;
                repairedById.set(node.id, repaired[index]);
            }
        }
    });
    
    // 2. Validate container child references
    repaired.forEach((node, index) => {
        if (node.type === 'container' && node.data?.childNodeIds) {
            const rawChildIds = node.data.childNodeIds;
            const childNodeIds: string[] = Array.isArray(rawChildIds) ? rawChildIds : [];
            const missingChildren = childNodeIds.filter(childId => !nodesById.has(childId));
            
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
                repairedById.set(node.id, repaired[index]);
            }
            
            // Check that all children actually reference this container (using parentId)
            const children = childNodeIds.map(id => nodesById.get(id)).filter(Boolean) as Node[];
            const misparentedChildren = children.filter(n => n.parentId !== node.id);
            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);
                // Auto-repair: fix parentId on children, mutating by index instead of full map reassignment
                misparentedChildren.forEach(child => {
                    const childIndex = nodeIndexById.get(child.id);
                    if (childIndex !== undefined) {
                        const updatedChild = { ...repaired[childIndex], parentId: node.id, extent: 'parent' as const };
                        repaired[childIndex] = updatedChild;
                        repairedById.set(child.id, updatedChild);
                    }
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
    
    repaired.forEach((node, index) => {
        // Need to fetch latest state since node might have been mutated previously
        const currentNode = repairedById.get(node.id);
        if (currentNode?.parentId && hasCircularRef(currentNode.id)) {
            errors.push(`Circular reference detected: ${currentNode.id}`);
            // Auto-repair: clear parentId
            const { parentId: _, extent: __, ...rest } = currentNode;
            repaired[index] = rest as Node;
            repairedById.set(currentNode.id, repaired[index]);
        }
    });
    
    // 4. Validate container data structure
    repaired.forEach((node, index) => {
        // Fetch latest state
        const currentNode = repairedById.get(node.id) || node;

        if (currentNode.type === 'container') {
            const data = currentNode.data;
            if (!data || typeof data !== 'object') {
                errors.push(`Container ${currentNode.id} has invalid data structure`);
                // Auto-repair: set default data
                const childrenIds: string[] = [];
                for (const potentialChild of nodes) {
                    if (potentialChild.parentId === currentNode.id) {
                        childrenIds.push(potentialChild.id);
                    }
                }

                repaired[index] = {
                    ...currentNode,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: childrenIds,
                        createdAt: new Date().toISOString(),
                    },
                };
                repairedById.set(currentNode.id, repaired[index]);
            } else if (data.type !== 'container') {
                errors.push(`Container ${currentNode.id} has incorrect type discriminator`);
                // Auto-repair: fix type discriminator
                repaired[index] = {
                    ...currentNode,
                    data: { ...data, type: 'container' },
                };
                repairedById.set(currentNode.id, repaired[index]);
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
