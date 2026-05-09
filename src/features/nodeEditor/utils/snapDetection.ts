/**
 * Snap zone detection logic for edge connections
 * Story 4-7: Complex Edge Connection Snapping (AC1, AC2)
 * 
 * Implements:
 * - 24px snap radius
 * - 36px release hysteresis (1.5x snap radius)
 * - Nearest handle tie-breaking
 * - Spatial indexing via quadtree for performance
 */

import type { XYPosition } from '@xyflow/react';
import type { HandlePosition, SnapResult } from '../types/connection';
import { isTypeCompatible } from './portColors';

/**
 * Snap zone configuration (AC1)
 */
export const SNAP_RADIUS = 24;
export const RELEASE_RADIUS = 36; // 1.5x snap radius for hysteresis
export const TOUCH_SNAP_RADIUS = 32; // Larger radius for touch devices

/**
 * Spatial query configuration (AC6)
 */
export const SPATIAL_QUERY_RADIUS = 100; // Query radius larger than snap radius for performance
export const DEFAULT_VIEWPORT_PADDING = 100; // Padding around viewport for handle filtering

/**
 * Interface for quadtree bounds
 */
interface QuadtreeBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Quadtree node for spatial indexing
 * Optimizes handle queries for large canvases (100+ nodes, AC6)
 */
interface QuadtreeNode {
    bounds: QuadtreeBounds;
    handles: HandlePosition[];
    children?: QuadtreeNode[];
}

/**
 * Spatial index for efficient handle queries
 * Uses quadtree subdivision for O(log n) queries
 */
export class HandleSpatialIndex {
    private root: QuadtreeNode;
    private maxHandles = 10;
    private maxDepth = 5;

    constructor(bounds: QuadtreeBounds) {
        // Guard against zero or negative bounds
        const safeBounds: QuadtreeBounds = {
            x: bounds.x,
            y: bounds.y,
            width: Math.max(1, bounds.width),
            height: Math.max(1, bounds.height)
        };
        this.root = { bounds: safeBounds, handles: [] };
    }

    /**
     * Insert a handle into the spatial index
     */
    insert(handle: HandlePosition): void {
        this.insertRecursive(this.root, handle, 0);
    }

    /**
     * Query handles within a radius of a center point
     */
    queryRange(center: XYPosition, radius: number): HandlePosition[] {
        const results: HandlePosition[] = [];
        const range: QuadtreeBounds = {
            x: center.x - radius,
            y: center.y - radius,
            width: radius * 2,
            height: radius * 2
        };

        this.queryRecursive(this.root, range, results);
        return results;
    }

    /**
     * Get all handles in the index
     */
    getAllHandles(): HandlePosition[] {
        const results: HandlePosition[] = [];
        this.collectAllHandles(this.root, results);
        return results;
    }

    private insertRecursive(node: QuadtreeNode, handle: HandlePosition, depth: number): void {
        // If leaf and under capacity, add directly
        if (!node.children && node.handles.length < this.maxHandles) {
            node.handles.push(handle);
            return;
        }

        // Subdivide if needed
        if (!node.children && depth < this.maxDepth) {
            this.subdivide(node);
        }

        // Insert into appropriate child
        if (node.children) {
            const child = this.getChildForPoint(node, handle);
            if (child) {
                this.insertRecursive(child, handle, depth + 1);
            } else {
                // Handle is outside bounds, add to this node
                node.handles.push(handle);
            }
        } else {
            // Max depth reached, add to this node
            node.handles.push(handle);
        }
    }

    private subdivide(node: QuadtreeNode): void {
        const { x, y, width, height } = node.bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        node.children = [
            // Top-left
            { bounds: { x, y, width: halfWidth, height: halfHeight }, handles: [] },
            // Top-right
            { bounds: { x: x + halfWidth, y, width: halfWidth, height: halfHeight }, handles: [] },
            // Bottom-left
            { bounds: { x, y: y + halfHeight, width: halfWidth, height: halfHeight }, handles: [] },
            // Bottom-right
            { bounds: { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, handles: [] }
        ];

        // Redistribute existing handles to children
        const handlesToRedistribute = [...node.handles];
        node.handles = [];

        for (const handle of handlesToRedistribute) {
            const child = this.getChildForPoint(node, handle);
            if (child) {
                child.handles.push(handle);
            } else {
                node.handles.push(handle);
            }
        }
    }

    private getChildForPoint(node: QuadtreeNode, handle: HandlePosition): QuadtreeNode | undefined {
        if (!node.children) return undefined;

        const { x, y, width, height } = node.bounds;
        const midX = x + width / 2;
        const midY = y + height / 2;

        // Determine which quadrant
        const isLeft = handle.x < midX;
        const isTop = handle.y < midY;

        if (isLeft && isTop) return node.children[0]; // Top-left
        if (!isLeft && isTop) return node.children[1]; // Top-right
        if (isLeft && !isTop) return node.children[2]; // Bottom-left
        return node.children[3]; // Bottom-right
    }

    private queryRecursive(node: QuadtreeNode, range: QuadtreeBounds, results: HandlePosition[]): void {
        if (!this.intersects(node.bounds, range)) return;

        // Check handles in this node
        for (const handle of node.handles) {
            if (this.pointInRange(handle, range)) {
                results.push(handle);
            }
        }

        // Recurse into children
        node.children?.forEach(child => {
            this.queryRecursive(child, range, results);
        });
    }

    private collectAllHandles(node: QuadtreeNode, results: HandlePosition[]): void {
        results.push(...node.handles);
        node.children?.forEach(child => {
            this.collectAllHandles(child, results);
        });
    }

    private intersects(a: QuadtreeBounds, b: QuadtreeBounds): boolean {
        return !(
            a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y
        );
    }

    private pointInRange(point: XYPosition, range: QuadtreeBounds): boolean {
        return (
            point.x >= range.x &&
            point.x <= range.x + range.width &&
            point.y >= range.y &&
            point.y <= range.y + range.height
        );
    }
}

/**
 * Calculate distance between two points
 */
export const getDistance = (a: XYPosition, b: XYPosition): number => {
    if (!isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x) || !isFinite(b.y)) {
        return Infinity;
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
};

/**
 * Detect if cursor is within snap zone of any handle
 * Implements AC1: Magnetic snap zone detection
 * 
 * @param cursorPosition - Current cursor position
 * @param candidateHandles - Array of potential target handles
 * @param sourceType - Type of the source port (for compatibility checking)
 * @param isTouch - Whether this is a touch interaction
 * @returns SnapResult with snapped status and position
 */
export const detectSnap = (
    cursorPosition: XYPosition,
    candidateHandles: HandlePosition[],
    sourceType?: string,
    isTouch = false
): SnapResult => {
    const snapRadius = isTouch ? TOUCH_SNAP_RADIUS : SNAP_RADIUS;

    // Find all handles within snap radius
    const handlesInRange = candidateHandles
        .map(h => ({
            ...h,
            distance: getDistance(cursorPosition, { x: h.x, y: h.y })
        }))
        .filter(h => h.distance <= snapRadius)
        .sort((a, b) => a.distance - b.distance);

    if (handlesInRange.length === 0) {
        return {
            snapped: false,
            position: cursorPosition,
            isValid: false
        };
    }

    // Get nearest handle
    const nearest = handlesInRange[0];

    // Check type compatibility if source type is provided
    const isValid = sourceType ? isTypeCompatible(sourceType, nearest.type) : true;

    return {
        snapped: true,
        handleId: nearest.id,
        nodeId: nearest.nodeId,
        position: { x: nearest.x, y: nearest.y },
        isValid
    };
};

/**
 * Detect snap with hysteresis to prevent flickering (AC1)
 * Uses different thresholds for entering (24px) vs exiting (36px) snap zone
 */
export const detectSnapWithHysteresis = (
    cursorPosition: XYPosition,
    candidateHandles: HandlePosition[],
    currentSnapResult: SnapResult | null,
    sourceType?: string,
    isTouch = false
): SnapResult => {
// @ts-ignore
    const snapRadius = isTouch ? TOUCH_SNAP_RADIUS : SNAP_RADIUS;
    const releaseRadius = isTouch ? TOUCH_SNAP_RADIUS * 1.5 : RELEASE_RADIUS;

    // If already snapped to a handle, check if we should release
    if (currentSnapResult?.snapped && currentSnapResult.handleId) {
        const snappedHandle = candidateHandles.find(h => h.id === currentSnapResult.handleId);
        
        // Handle may have been deleted - if not found, fall through to detect new snap
        if (!snappedHandle) {
            return detectSnap(cursorPosition, candidateHandles, sourceType, isTouch);
        }
        
        const distance = getDistance(cursorPosition, { x: snappedHandle.x, y: snappedHandle.y });
        
        // Only release if cursor moves beyond release radius (hysteresis)
        if (distance <= releaseRadius) {
            // Stay snapped
            return currentSnapResult;
        }
    }

    // Either not snapped or released - check for new snap
    return detectSnap(cursorPosition, candidateHandles, sourceType, isTouch);
};

/**
 * Filter handles by viewport for performance optimization (AC6)
 * Only returns handles within viewport + padding
 */
export const filterHandlesByViewport = (
    handles: HandlePosition[],
    viewport: { x: number; y: number; zoom: number },
    canvasSize: { width: number; height: number },
    padding = 100
): HandlePosition[] => {
    // Guard against invalid zoom
    const zoom = Math.max(0.001, viewport.zoom);
    
    // Convert viewport to world coordinates
    const viewLeft = -viewport.x / zoom;
    const viewTop = -viewport.y / zoom;
    const viewRight = viewLeft + canvasSize.width / zoom;
    const viewBottom = viewTop + canvasSize.height / zoom;

    // Expand by padding
    const paddedLeft = viewLeft - padding;
    const paddedTop = viewTop - padding;
    const paddedRight = viewRight + padding;
    const paddedBottom = viewBottom + padding;

    return handles.filter(h => 
        h.x >= paddedLeft &&
        h.x <= paddedRight &&
        h.y >= paddedTop &&
        h.y <= paddedBottom
    );
};

/**
 * Create spatial index from handle array
 */
export const createSpatialIndex = (
    handles: HandlePosition[],
    canvasBounds: QuadtreeBounds
): HandleSpatialIndex => {
    const index = new HandleSpatialIndex(canvasBounds);
    handles.forEach(handle => index.insert(handle));
    return index;
};
