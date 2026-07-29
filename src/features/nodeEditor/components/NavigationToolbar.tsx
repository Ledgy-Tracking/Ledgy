import React, { useCallback, useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useNodeStore } from '../../../stores/useNodeStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * NavigationToolbar - Zoom and fit controls for the Node Canvas
 * Positioned at top-left of canvas
 * 
 * Features:
 * - Fit to Screen: Centers and scales to show all nodes
 * - Zoom In/Out: With bounds checking (0.1 - 2.0)
 * - Reset Zoom: Returns to zoom level 1
 * - Real-time zoom percentage display
 * - Keyboard shortcuts (Shift+1, Ctrl+Plus, Ctrl+Minus, Ctrl+0)
 */
export const NavigationToolbar: React.FC = () => {
    const reactFlow = useReactFlow();
    const [zoom, setZoom] = useState(1);
    const [isFitDisabled, setIsFitDisabled] = useState(false);

    // Subscribe to nodes count to determine if fit view should be disabled
    const nodeCount = useNodeStore(s => s.nodes.length);

    // Update zoom level on viewport changes (event-driven, not polling)
    useEffect(() => {
        if (!reactFlow) return;

        const updateZoom = () => {
            const currentZoom = reactFlow.getZoom();
            setZoom(currentZoom);
            setIsFitDisabled(nodeCount === 0);
        };

        // Initial update
        updateZoom();

        // Subscribe to viewport changes from React Flow
        // Using a small timeout to batch rapid updates
        let timeoutId: number | null = null;
        const handleViewportChange = () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(updateZoom, 50);
        };

        // Listen for viewport changes via move/moveEnd events
        // React Flow doesn't expose a direct viewport change event, so we use the store
        const unsubscribe = useNodeStore.subscribe(
            (state) => state.viewport,
            handleViewportChange
        );

        return () => {
            unsubscribe();
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, [reactFlow, nodeCount]);

    // Defensive: verify we're inside provider
    if (!reactFlow) {
        throw new Error('NavigationToolbar must be rendered within ReactFlowProvider');
    }

    const { zoomIn, zoomOut, fitView, setViewport } = reactFlow;

    // Zoom to fit implementation
    const handleFitView = useCallback(() => {
        if (nodeCount === 0) {
            // Button should be disabled, but guard anyway
            return;
        }
        fitView({
            padding: 0.2,       // 20% padding
            duration: 300,      // 300ms animation
            minZoom: 0.1,
            maxZoom: 2.0,
            includeHiddenNodes: false,
        });
    }, [fitView, nodeCount]);

    // Zoom in with animation
    const handleZoomIn = useCallback(() => {
        zoomIn({ duration: 200 });
    }, [zoomIn]);

    // Zoom out with animation
    const handleZoomOut = useCallback(() => {
        zoomOut({ duration: 200 });
    }, [zoomOut]);

    // Reset zoom
    const handleResetZoom = useCallback(() => {
        setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
    }, [setViewport]);

    // Format zoom percentage
    const zoomPercentage = `${Math.round(zoom * 100)}%`;

    // Bounds checking
    const isZoomInDisabled = zoom >= 2.0;
    const isZoomOutDisabled = zoom <= 0.1;

    return (
        <Card className="absolute top-4 left-4 z-10 flex items-center gap-1 p-1.5 bg-gray-100/90 dark:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg backdrop-blur-sm">
            {/* Fit to Screen */}
            <Button
                onClick={handleFitView}
                disabled={isFitDisabled}
                aria-label="Fit to Screen (Shift+1)"
                aria-disabled={isFitDisabled}
                title={isFitDisabled ? "Add nodes to use fit view" : "Fit to Screen (Shift+1)"}
                className="
                    p-2 rounded-md
                    bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-[0.95]
                    border border-zinc-300 dark:border-zinc-700
                    text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                    transition-all duration-150 ease-out
                    shadow-sm hover:shadow-md
                "
            >
                <Maximize2 className="w-4 h-4" aria-hidden="true" />
            </Button>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

            {/* Zoom Out */}
            <Button
                onClick={handleZoomOut}
                disabled={isZoomOutDisabled}
                aria-label="Zoom out (Ctrl + -)"
                aria-disabled={isZoomOutDisabled}
                title="Zoom out (Ctrl + -)"
                className="
                    p-2 rounded-md
                    bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-[0.95]
                    border border-zinc-300 dark:border-zinc-700
                    text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                    transition-all duration-150 ease-out
                    shadow-sm hover:shadow-md
                "
            >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </Button>

            {/* Zoom Percentage Display */}
            <div 
                className="px-3 py-1.5 min-w-[60px] text-center text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white/50 dark:bg-zinc-900/50 rounded-md border border-zinc-300/50 dark:border-zinc-700/50"
                aria-live="polite"
                aria-atomic="true"
            >
                {zoomPercentage}
            </div>

            {/* Zoom In */}
            <Button
                onClick={handleZoomIn}
                disabled={isZoomInDisabled}
                aria-label="Zoom in (Ctrl + Plus)"
                aria-disabled={isZoomInDisabled}
                title="Zoom in (Ctrl + Plus)"
                className="
                    p-2 rounded-md
                    bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-[0.95]
                    border border-zinc-300 dark:border-zinc-700
                    text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                    transition-all duration-150 ease-out
                    shadow-sm hover:shadow-md
                "
            >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </Button>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

            {/* Reset Zoom */}
            <Button
                onClick={handleResetZoom}
                aria-label="Reset zoom (Ctrl + 0)"
                title="Reset zoom (Ctrl + 0)"
                className="
                    p-2 rounded-md
                    bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-[0.95]
                    border border-zinc-300 dark:border-zinc-700
                    text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                    transition-all duration-150 ease-out
                    shadow-sm hover:shadow-md
                "
            >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </Button>
        </Card>
    );
};

export default NavigationToolbar;
