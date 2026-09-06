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
    
    // ⚡ Bolt: Pre-compute maps for O(1) lookups inside loops
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const childrenByParent = new Map<string, string[]>();
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.parentId) {
            let children = childrenByParent.get(n.parentId);
            if (!children) {
                children = [];
                childrenByParent.set(n.parentId, children);
            }
            children.push(n.id);
        }
    }

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            const parent = nodeMap.get(node.parentId);
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
                childId => !nodeMap.has(childId)
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
            const children = nodes.filter(n => childNodeIds.includes(n.id));
            const misparentedChildren = children.filter(n => n.parentId !== node.id);
            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);
                // Auto-repair: fix parentId on children
                repaired = repaired.map(n => {
                    if (misparentedChildren.find(c => c.id === n.id)) {
                        return { ...n, parentId: node.id, extent: 'parent' as const };
                    }
                    return n;
                });
            }
        }
    });
    
    // 3. Prevent circular references
    // ⚡ Bolt: Pre-compute repaired map for efficient circular ref checks
    const repairedMap = new Map(repaired.map(n => [n.id, n]));
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
            // Update repairedMap to reflect the change for subsequent checks
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
                        childNodeIds: childrenByParent.get(node.id) || [],
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
