import { useCallback } from 'react';
import { useNodeStore } from '../../../stores/useNodeStore';

/**
 * Container state management hook
 * Handles expand/collapse state for container nodes
 * 
 * Story 4.9: Container expand/collapse behavior
 */
export interface UseContainerStateReturn {
    /** Expand a container */
    expandContainer: (containerId: string) => void;
    /** Collapse a container */
    collapseContainer: (containerId: string) => void;
    /** Toggle container expand/collapse */
    toggleContainer: (containerId: string) => void;
    /** Set container label */
    setContainerLabel: (containerId: string, label: string) => void;
}

/**
 * Hook for managing container expand/collapse state
 */
export const useContainerState = (): UseContainerStateReturn => {
    const updateNodeData = useNodeStore(state => state.updateNodeData);
    const debouncedSaveCanvas = useNodeStore(state => state.debouncedSaveCanvas);

    const expandContainer = useCallback((containerId: string) => {
        updateNodeData(containerId, { isCollapsed: false });
        debouncedSaveCanvas();
    }, [updateNodeData, debouncedSaveCanvas]);

    const collapseContainer = useCallback((containerId: string) => {
        updateNodeData(containerId, { isCollapsed: true });
        debouncedSaveCanvas();
    }, [updateNodeData, debouncedSaveCanvas]);

    const toggleContainer = useCallback((containerId: string) => {
        const state = useNodeStore.getState();
        const container = state.nodes.find(n => n.id === containerId);
        if (container?.data) {
            const newState = !container.data.isCollapsed;
            updateNodeData(containerId, { isCollapsed: newState });
            debouncedSaveCanvas();
        }
    }, [updateNodeData, debouncedSaveCanvas]);

    const setContainerLabel = useCallback((containerId: string, label: string) => {
        updateNodeData(containerId, { label });
        debouncedSaveCanvas();
    }, [updateNodeData, debouncedSaveCanvas]);

    return {
        expandContainer,
        collapseContainer,
        toggleContainer,
        setContainerLabel,
    };
};

export default useContainerState;
