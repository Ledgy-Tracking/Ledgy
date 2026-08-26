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
    
    // ⚡ Bolt: Index nodes for O(1) lookups to avoid O(N^2) complexity in validation loops
    const nodeIds = new Set(nodes.map(n => n.id));
    const repairedNodesMap = new Map(repaired.map(n => [n.id, n]));

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            const hasParent = nodeIds.has(node.parentId);
            if (!hasParent) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                repaired[index] = rest as Node;
                repairedNodesMap.set(node.id, repaired[index]);
            }
        }
    });
    
    // 2. Validate container child references
    repaired.forEach((node, index) => {
        if (node.type === 'container' && node.data?.childNodeIds) {
            const rawChildIds = node.data.childNodeIds;
            const childNodeIds: string[] = Array.isArray(rawChildIds) ? rawChildIds : [];

            // ⚡ Bolt: Replaced missing child O(N) lookup with O(1) Set lookup
            const missingChildren = childNodeIds.filter(
                childId => !nodeIds.has(childId)
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
                repairedNodesMap.set(node.id, repaired[index]);
            }
            
            // Check that all children actually reference this container (using parentId)
            const children = nodes.filter(n => childNodeIds.includes(n.id));
            const misparentedChildren = children.filter(n => n.parentId !== node.id);
            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);

                // ⚡ Bolt: Replaced misparented child O(N^2) mapping with O(1) Set lookup
                const misparentedIds = new Set(misparentedChildren.map(c => c.id));
                // Auto-repair: fix parentId on children
                repaired = repaired.map(n => {
                    if (misparentedIds.has(n.id)) {
                        const updatedNode = { ...n, parentId: node.id, extent: 'parent' as const };
                        repairedNodesMap.set(n.id, updatedNode);
                        return updatedNode;
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
        // ⚡ Bolt: Replaced O(N) array find inside recursive call with O(1) Map get
        const node = repairedNodesMap.get(nodeId);
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
                repairedNodesMap.set(node.id, repaired[index]);
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
                repaired[index] = {
                    ...node,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: nodes.filter(n => n.parentId === node.id).map(n => n.id),
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
