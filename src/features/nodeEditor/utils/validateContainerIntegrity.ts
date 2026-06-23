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
    
    // O(N) Maps for fast lookups
    const nodesById = new Map<string, Node>();
    nodes.forEach(n => nodesById.set(n.id, n));

    const repairedIndexMap = new Map<string, number>();
    const repairedById = new Map<string, Node>();
    repaired.forEach((n, idx) => {
        repairedIndexMap.set(n.id, idx);
        repairedById.set(n.id, n);
    });

    const updateRepaired = (index: number, newNode: Node) => {
        repaired[index] = newNode;
        repairedById.set(newNode.id, newNode);
    };

    // 1. Check for orphaned children (React Flow v12 uses parentId)
    repaired.forEach((node, index) => {
        if (node.parentId) {
            const parent = nodesById.get(node.parentId);
            if (!parent) {
                errors.push(`Orphaned child: ${node.id} references missing parent ${node.parentId}`);
                // Auto-repair: clear parentId
                const { parentId: _, extent: __, ...rest } = node;
                updateRepaired(index, rest as Node);
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
                const newNode = {
                    ...node,
                    data: {
                        ...node.data,
                        childNodeIds: childNodeIds.filter(
                            id => !missingChildren.includes(id)
                        ),
                    },
                };
                updateRepaired(index, newNode);
            }
            
            // Check that all children actually reference this container (using parentId)
            const children = childNodeIds.map(id => nodesById.get(id)).filter((n): n is Node => n !== undefined);
            const misparentedChildren = children.filter(n => n.parentId !== node.id);
            if (misparentedChildren.length > 0) {
                errors.push(`Container ${node.id} has children with wrong parentId: ${misparentedChildren.map(n => n.id).join(', ')}`);
                // Auto-repair: fix parentId on children
                misparentedChildren.forEach(c => {
                    const childIdx = repairedIndexMap.get(c.id);
                    if (childIdx !== undefined) {
                        const updatedChild = { ...repaired[childIdx], parentId: node.id, extent: 'parent' as const };
                        updateRepaired(childIdx, updatedChild);
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
        if (node.parentId && hasCircularRef(node.id)) {
            errors.push(`Circular reference detected: ${node.id}`);
            // Auto-repair: clear parentId
            const { parentId: _, extent: __, ...rest } = node;
            updateRepaired(index, rest as Node);
        }
    });
    
    // 4. Validate container data structure
    repaired.forEach((node, index) => {
        if (node.type === 'container') {
            const data = node.data;
            if (!data || typeof data !== 'object') {
                errors.push(`Container ${node.id} has invalid data structure`);
                // Auto-repair: set default data
                const newNode = {
                    ...node,
                    data: {
                        type: 'container',
                        label: 'Group',
                        isCollapsed: false,
                        childNodeIds: nodes.filter(n => n.parentId === node.id).map(n => n.id),
                        createdAt: new Date().toISOString(),
                    },
                };
                updateRepaired(index, newNode);
            } else if (data.type !== 'container') {
                errors.push(`Container ${node.id} has incorrect type discriminator`);
                // Auto-repair: fix type discriminator
                const newNode = {
                    ...node,
                    data: { ...data, type: 'container' },
                };
                updateRepaired(index, newNode);
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
