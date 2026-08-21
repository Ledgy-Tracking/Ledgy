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
    
    // ⚡ Bolt: Create O(1) lookups for nodes and their children
    // Prevents O(n^2) search overhead on large diagrams
    const nodesMap = new Map<string, Node>();
    const childrenMap = new Map<string, string[]>();

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        nodesMap.set(node.id, node);
        if (node.parentId) {
            let siblings = childrenMap.get(node.parentId);
            if (!siblings) {
                siblings = [];
                childrenMap.set(node.parentId, siblings);
            }
            siblings.push(node.id);
        }
    }

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            const parent = nodesMap.get(node.parentId);
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
                childId => !nodesMap.has(childId)
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
            const children: Node[] = [];
            for (let i = 0; i < childNodeIds.length; i++) {
                const child = nodesMap.get(childNodeIds[i]);
                if (child) children.push(child);
            }
            const misparentedChildren = children.filter(n => n.parentId !== node.id);
            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);
                // Auto-repair: fix parentId on children
                const misparentedSet = new Set(misparentedChildren.map(c => c.id));
                repaired = repaired.map(n => {
                    if (misparentedSet.has(n.id)) {
                        return { ...n, parentId: node.id, extent: 'parent' as const };
                    }
                    return n;
                });
            }
        }
    });
    
    // ⚡ Bolt: Build map of current repaired state for O(1) circular dependency checking
    const repairedMap = new Map<string, Node>();
    for (let i = 0; i < repaired.length; i++) {
        repairedMap.set(repaired[i].id, repaired[i]);
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
    
    repaired.forEach((node, index) => {
        if (node.parentId && hasCircularRef(node.id)) {
            errors.push(`Circular reference detected: ${node.id}`);
            // Auto-repair: clear parentId
            const { parentId: _, extent: __, ...rest } = node;
            repaired[index] = rest as Node;
            repairedMap.set(node.id, rest as Node);
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
                        childNodeIds: childrenMap.get(node.id) || [],
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
