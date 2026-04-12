import { useState, useCallback } from 'react';
import { Node, useReactFlow } from '@xyflow/react';

/**
 * Selection state management hook
 * Syncs FROM React Flow's native selection as source of truth
 * 
 * Story 4.9: Multi-node selection for container grouping
 */
export interface UseNodeSelectionReturn {
    /** Currently selected node IDs */
    selectedIds: string[];
    /** Number of selected nodes */
    selectionCount: number;
    /** Whether multiple nodes are selected */
    hasMultiSelection: boolean;
    /** React Flow's onSelectionChange handler - wire this to ReactFlow component */
    onSelectionChange: (params: { nodes: Node[] }) => void;
    /** Select all nodes */
    selectAll: () => void;
    /** Clear selection */
    clearSelection: () => void;
    /** Check if a node is selected */
    isSelected: (nodeId: string) => boolean;
}

/**
 * Hook for managing node selection state
 * Uses React Flow's native selection as source of truth
 */
export const useNodeSelection = (): UseNodeSelectionReturn => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const { getNodes } = useReactFlow();

    // Sync FROM React Flow - this is the source of truth
    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        setSelectedIds(nodes.map(n => n.id));
    }, []);

    // Select all nodes
    const selectAll = useCallback(() => {
        const allNodes = getNodes();
        setSelectedIds(allNodes.map(n => n.id));
    }, [getNodes]);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    // Check if node is selected
    const isSelected = useCallback((nodeId: string) => {
        return selectedIds.includes(nodeId);
    }, [selectedIds]);

    return {
        selectedIds,
        selectionCount: selectedIds.length,
        hasMultiSelection: selectedIds.length > 1,
        onSelectionChange,
        selectAll,
        clearSelection,
        isSelected,
    };
};

export default useNodeSelection;
