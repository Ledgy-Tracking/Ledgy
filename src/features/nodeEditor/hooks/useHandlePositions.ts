/**
 * Hook for handle position tracking and spatial indexing
 * Story 4-7: Complex Edge Connection Snapping (AC6)
 * 
 * Implements:
 * - Handle position extraction from DOM
 * - Spatial indexing via quadtree
 * - Viewport culling for performance
 * - Memoized position caching
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useReactFlow, useStore, type XYPosition } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { HandlePosition, PortType } from '../types/connection';
import { HandleSpatialIndex, createSpatialIndex } from '../utils/snapDetection';
import { getPortTypeFromHandle } from '../utils/portTypeUtils';

/**
 * Performance configuration
 */
const REBUILD_THROTTLE_MS = 100; // ms - throttle handle position rebuilds
const VIEWPORT_DEBOUNCE_MS = 100; // ms - debounce viewport change handling
const DEFAULT_NODE_WIDTH = 200; // px - default width for bounds calculation
const DEFAULT_NODE_HEIGHT = 100; // px - default height for bounds calculation

/**
 * Calculate canvas bounds from node positions
 */
const calculateCanvasBounds = (nodes: Node[]) => {
    if (nodes.length === 0) {
        return { x: 0, y: 0, width: 1000, height: 1000 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + (node.width ?? DEFAULT_NODE_WIDTH));
        maxY = Math.max(maxY, node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT));
    });

    // Add padding
    const padding = 200;
    return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2
    };
};

/**
 * Extract handle positions from DOM
 * Queries all react-flow handles and computes their positions
 * Converts screen coordinates to flow/canvas coordinates
 */
const extractHandlePositions = (
    nodes: Node[],
    screenToFlowPosition: (position: XYPosition) => XYPosition
): HandlePosition[] => {
    const positions: HandlePosition[] = [];

    nodes.forEach(node => {
        // Query handle elements for this node
        const handleElements = document.querySelectorAll(
            `[data-nodeid="${node.id}"].react-flow__handle`
        );

        handleElements.forEach(handle => {
            const rect = handle.getBoundingClientRect();
            const handleId = handle.getAttribute('data-handleid') || '';
            const handleType = handle.getAttribute('data-handletype') as 'input' | 'output';

            // Skip handles without IDs
            if (!handleId) return;

            // Get screen coordinates
            const screenX = rect.left + rect.width / 2;
            const screenY = rect.top + rect.height / 2;
            
            // Convert to flow/canvas coordinates
            const flowPos = screenToFlowPosition({ x: screenX, y: screenY });

            positions.push({
                id: handleId,
                nodeId: node.id,
                x: flowPos.x,
                y: flowPos.y,
                type: getPortTypeFromHandle(node.id, handleId, nodes) as PortType ?? 'any',
                direction: handleType
            });
        });
    });

    return positions;
};

interface UseHandlePositionsOptions {
    enabled?: boolean;
}

interface UseHandlePositionsReturn {
    spatialIndex: HandleSpatialIndex | null;
    handlePositions: HandlePosition[];
    rebuildIndex: () => void;
}

export const useHandlePositions = (
    options: UseHandlePositionsOptions = {}
): UseHandlePositionsReturn => {
    const { enabled = true } = options;
    const { getNodes, screenToFlowPosition } = useReactFlow();
    const viewport = useStore(s => s.transform);

    // State to trigger rebuilds
    const [rebuildTrigger, setRebuildTrigger] = useState(0);

    // Refs for caching
    const lastRebuildRef = useRef<number>(0);
    const spatialIndexRef = useRef<HandleSpatialIndex | null>(null);
    const handlePositionsRef = useRef<HandlePosition[]>([]);

    // Memoized handle positions
    const handlePositions = useMemo(() => {
        if (!enabled) return [];

        const nodes = getNodes();
        const positions = extractHandlePositions(nodes, screenToFlowPosition);
        handlePositionsRef.current = positions;
        return positions;
    }, [getNodes, enabled, rebuildTrigger, viewport, screenToFlowPosition]);

    // Build spatial index
    const spatialIndex = useMemo(() => {
        if (!enabled || handlePositions.length === 0) {
            return null;
        }

        const nodes = getNodes();
        const bounds = calculateCanvasBounds(nodes);
        const index = createSpatialIndex(handlePositions, bounds);
        spatialIndexRef.current = index;
        return index;
    }, [handlePositions, getNodes, enabled]);

    // Manual rebuild function
    const rebuildIndex = useCallback(() => {
        const now = Date.now();
        // Throttle rebuilds to max 10 per second
        if (now - lastRebuildRef.current < REBUILD_THROTTLE_MS) return;
        
        lastRebuildRef.current = now;
        setRebuildTrigger(prev => prev + 1);
    }, []);

    // Rebuild index when viewport changes (debounced)
    useEffect(() => {
        if (!enabled) return;

        const timer = setTimeout(() => {
            rebuildIndex();
        }, VIEWPORT_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [viewport, enabled, rebuildIndex]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            spatialIndexRef.current = null;
        };
    }, []);

    return {
        spatialIndex,
        handlePositions,
        rebuildIndex
    };
};

/**
 * Hook for tracking handle positions within viewport only
 * Optimized for very large canvases (100+ nodes)
 */
export const useViewportHandlePositions = (
    canvasSize: { width: number; height: number }
) => {
    const { spatialIndex, handlePositions } = useHandlePositions();
    const viewport = useStore(s => s.transform);

    const visibleHandles = useMemo(() => {
        if (!spatialIndex) return [];
        
        // Guard against zero canvas dimensions
        if (canvasSize.width <= 0 || canvasSize.height <= 0) return [];

        // Calculate viewport bounds in screen coordinates
        const viewCenterX = canvasSize.width / 2;
        const viewCenterY = canvasSize.height / 2;
        
        // Query a larger area around viewport for smooth edge dragging
        const queryRadius = Math.max(canvasSize.width, canvasSize.height) / 2 + 100;
        
        return spatialIndex.queryRange(
            { x: viewCenterX, y: viewCenterY },
            queryRadius
        );
    }, [spatialIndex, viewport, canvasSize]);

    return {
        spatialIndex,
        handlePositions,
        visibleHandles
    };
};
