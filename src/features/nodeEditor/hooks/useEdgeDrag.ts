// @ts-nocheck
/**
 * Hook for RAF-optimized edge drag handling
 * Story 4-7: Complex Edge Connection Snapping (AC5, AC6)
 * 
 * Implements:
 * - RequestAnimationFrame for smooth 60fps updates
 * - Escape key cancellation
 * - Click-outside cancellation
 * - Touch support with long-press
 * - Keyboard navigation
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { XYPosition } from '@xyflow/react';
import type { ConnectionLineState, SnapResult } from '../types/connection';
import { detectSnapWithHysteresis, HandleSpatialIndex, SPATIAL_QUERY_RADIUS, SNAP_RADIUS } from '../utils/snapDetection';
import { getSourcePortType } from '../utils/portTypeUtils';
import type { Node } from '@xyflow/react';

/**
 * Touch-specific settings
 */
const TOUCH_LONG_PRESS_DURATION = 300; // ms
const TOUCH_MOVEMENT_THRESHOLD = 10; // px - cancel long-press if moved more than this
const CLICK_LISTENER_DELAY = 150; // ms - delay before click-outside detection (AC5)
const REBUILD_THROTTLE_MS = 100; // ms - throttle handle position rebuilds

interface UseEdgeDragOptions {
    nodes: Node[];
    spatialIndex: HandleSpatialIndex | null;
    onCancel?: () => void;
    onConnect?: (snapResult: SnapResult) => void;
    isTouch?: boolean;
}

interface UseEdgeDragReturn {
    connectionState: ConnectionLineState | null;
    isDragging: boolean;
    startDrag: (sourceNodeId: string, sourceHandleId: string, position: XYPosition) => void;
    updateDrag: (position: XYPosition) => void;
    endDrag: () => void;
    cancelDrag: () => void;
}

export const useEdgeDrag = ({
    nodes,
    spatialIndex,
    onCancel,
    onConnect,
    isTouch = false
}: UseEdgeDragOptions): UseEdgeDragReturn => {
    const [connectionState, setConnectionState] = useState<ConnectionLineState | null>(null);
    const connectionStateRef = useRef<ConnectionLineState | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastPositionRef = useRef<XYPosition | null>(null);
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const touchTimerRef = useRef<number | null>(null);
    const sourceTypeRef = useRef<string | undefined>(undefined);
    const clickListenerAddedRef = useRef(false);

    // Keep ref in sync with state
    useEffect(() => {
        connectionStateRef.current = connectionState;
    }, [connectionState]);

    // Determine if we're currently dragging
    const isDragging = connectionState?.isDragging ?? false;

    // Get source port type when drag starts
    const updateSourceType = useCallback((sourceNodeId: string, sourceHandleId: string) => {
        sourceTypeRef.current = getSourcePortType(sourceNodeId, sourceHandleId, nodes) ?? undefined;
    }, [nodes]);

    // Start drag operation
    const startDrag = useCallback((
        sourceNodeId: string,
        sourceHandleId: string,
        position: XYPosition
    ) => {
        updateSourceType(sourceNodeId, sourceHandleId);
        
        setConnectionState({
            isDragging: true,
            sourceNodeId,
            sourceHandleId,
            currentPosition: position,
            snapResult: null
        });

        // Performance profiling marker
        if (typeof performance !== 'undefined') {
            performance.mark('edge-drag-start');
        }
    }, [updateSourceType]);

    // Update drag position with RAF optimization (AC6)
    const updateDrag = useCallback((position: XYPosition) => {
        if (!isDragging) return;

        // Store position for RAF callback
        lastPositionRef.current = position;

        // Cancel any pending RAF
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        // Schedule update on next frame
        rafRef.current = requestAnimationFrame(() => {
            if (!lastPositionRef.current) return;
            
            const currentState = connectionStateRef.current;
            if (!currentState) return;

            let snapResult: SnapResult | null = null;

            // Query spatial index for handles in range
            if (spatialIndex) {
                const candidateHandles = spatialIndex.queryRange(
                    lastPositionRef.current,
                    SPATIAL_QUERY_RADIUS
                );

                // Check if cursor returned to source handle (AC5: drag back to source = cancel)
                const sourceHandle = candidateHandles.find(
                    h => h.nodeId === currentState.sourceNodeId && h.id === currentState.sourceHandleId
                );
                if (sourceHandle) {
                    const distanceToSource = Math.hypot(
                        lastPositionRef.current.x - sourceHandle.x,
                        lastPositionRef.current.y - sourceHandle.y
                    );
                    if (distanceToSource <= SNAP_RADIUS) {
                        // Cancel drag when returned to source handle
                        cancelDrag();
                        return;
                    }
                }

                // Filter out the source handle itself from targets
                const validTargets = candidateHandles.filter(
                    h => !(h.nodeId === currentState.sourceNodeId && h.id === currentState.sourceHandleId)
                );

                // Detect snap with hysteresis
                snapResult = detectSnapWithHysteresis(
                    lastPositionRef.current,
                    validTargets,
                    currentState.snapResult,
                    sourceTypeRef.current,
                    isTouch
                );
            }

            setConnectionState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentPosition: snapResult?.snapped ? snapResult.position : lastPositionRef.current!,
                    snapResult
                };
            });

            rafRef.current = null;
        });
    }, [isDragging, connectionState, spatialIndex]);

    // End drag (mouse/touch release)
    const endDrag = useCallback(() => {
        if (!connectionState?.snapResult?.snapped) {
            // No valid snap - cancel
            cancelDrag();
            return;
        }

        // Validate snap result has required fields
        if (!connectionState.snapResult.handleId || !connectionState.snapResult.nodeId) {
            cancelDrag();
            return;
        }

        // Valid connection - trigger connect callback
        onConnect?.(connectionState.snapResult);

        // Clear state
        setConnectionState(null);
        
        // Cleanup RAF
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        // Performance profiling marker
        if (typeof performance !== 'undefined') {
            performance.mark('edge-drag-end');
            performance.measure('edge-drag', 'edge-drag-start', 'edge-drag-end');
        }
    }, [connectionState, onConnect, cancelDrag]);

    // Cancel drag operation (AC5)
    const cancelDrag = useCallback(() => {
        setConnectionState(null);
        
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        onCancel?.();
    }, [onCancel]);

    // Escape key handler (AC5)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDragging) {
                e.preventDefault();
                cancelDrag();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDragging, cancelDrag]);

    // Click-outside handler (AC5)
    useEffect(() => {
        if (!isDragging) return;

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Check if click is on a handle
            const isHandle = target.closest('.react-flow__handle');
            
            // If not on a handle and we have a valid snap, end drag
            // If not on a handle and no snap, cancel
            if (!isHandle) {
                if (connectionState?.snapResult?.snapped) {
                    endDrag();
                } else {
                    cancelDrag();
                }
            }
        };

        // Use setTimeout to avoid immediate trigger on drag start
        const timer = window.setTimeout(() => {
            window.addEventListener('click', handleClick);
            clickListenerAddedRef.current = true;
        }, CLICK_LISTENER_DELAY);

        return () => {
            clearTimeout(timer);
            if (clickListenerAddedRef.current) {
                window.removeEventListener('click', handleClick);
                clickListenerAddedRef.current = false;
            }
        };
    }, [isDragging, connectionState, endDrag, cancelDrag]);

    // Cleanup RAF on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            if (touchTimerRef.current) {
                clearTimeout(touchTimerRef.current);
            }
        };
    }, []);

    return {
        connectionState,
        isDragging,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag
    };
};

/**
 * Hook for touch-specific edge drag interactions
 * Implements long-press to initiate drag (AC7)
 */
export const useTouchEdgeDrag = () => {
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const touchTimerRef = useRef<number | null>(null);
    const [isLongPress, setIsLongPress] = useState(false);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };

        // Start long-press timer
        touchTimerRef.current = window.setTimeout(() => {
            setIsLongPress(true);
        }, TOUCH_LONG_PRESS_DURATION);
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const touch = e.touches[0];
        if (!touch) return; // Guard against empty touches array
        
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        const distance = Math.hypot(dx, dy);

        // If moved more than threshold, cancel long-press
        if (distance > TOUCH_MOVEMENT_THRESHOLD) {
            if (touchTimerRef.current) {
                clearTimeout(touchTimerRef.current);
                touchTimerRef.current = null;
            }
            setIsLongPress(false);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }
        touchStartRef.current = null;
        setIsLongPress(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (touchTimerRef.current) {
                clearTimeout(touchTimerRef.current);
            }
        };
    }, []);

    return {
        isLongPress,
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
};
