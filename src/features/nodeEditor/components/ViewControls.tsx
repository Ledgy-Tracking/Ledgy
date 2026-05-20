import React, { useCallback } from 'react';
import { Eye, EyeOff, Grid3X3, Magnet, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNodeStore } from '../../../stores/useNodeStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

/**
 * ViewControls - Collapsible panel for minimap, grid, and snap controls
 * Positioned at top-right of canvas
 * 
 * Features:
 * - Toggle minimap visibility (H shortcut)
 * - Toggle grid visibility (G shortcut)
 * - Toggle snap-to-grid (S shortcut)
 * - Collapsible panel with 150ms ease-out transition
 * - Persistence to PouchDB
 * - ARIA-compliant toggle buttons
 */
export const ViewControls: React.FC = () => {
    // View controls state - nested subscription for performance
    const viewControls = useNodeStore(s => s.viewControls);
    const setShowMinimap = useNodeStore(s => s.setShowMinimap);
    const setShowGrid = useNodeStore(s => s.setShowGrid);
    const setSnapToGrid = useNodeStore(s => s.setSnapToGrid);
    const setViewControlsCollapsed = useNodeStore(s => s.setViewControlsCollapsed);

    // Destructure for cleaner code
    const { showMinimap, showGrid, snapToGrid, isViewControlsCollapsed } = viewControls;

    // Toggle handlers with debounced save trigger
    const handleToggleMinimap = useCallback(() => {
        setShowMinimap(!showMinimap);
        // Trigger debounced save for persistence
        useNodeStore.getState().debouncedSaveCanvas();
    }, [showMinimap, setShowMinimap]);

    const handleToggleGrid = useCallback(() => {
        setShowGrid(!showGrid);
        useNodeStore.getState().debouncedSaveCanvas();
    }, [showGrid, setShowGrid]);

    const handleToggleSnap = useCallback(() => {
        setSnapToGrid(!snapToGrid);
        useNodeStore.getState().debouncedSaveCanvas();
    }, [snapToGrid, setSnapToGrid]);

    // Collapse toggle handler
    const handleToggleCollapse = useCallback(() => {
        setViewControlsCollapsed(!isViewControlsCollapsed);
        // Trigger debounced save for persistence
        useNodeStore.getState().debouncedSaveCanvas();
    }, [isViewControlsCollapsed, setViewControlsCollapsed]);

    // Note: Keyboard shortcuts (H, G, S) are handled by useNodeKeyboardShortcuts hook
    // in NodeCanvas.tsx to avoid duplicate handlers and ensure single source of truth

    return (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {/* Controls Panel - collapsible with 150ms ease-out transition */}
            <Card 
                className={`
                    flex items-center gap-1 p-1.5 
                    bg-gray-100/90 dark:bg-zinc-800/90 
                    border border-zinc-300 dark:border-zinc-700 
                    rounded-lg shadow-lg backdrop-blur-sm
                    transition-all duration-150 ease-out overflow-hidden
                    ${isViewControlsCollapsed ? 'w-0 opacity-0 p-0 border-0' : 'w-auto opacity-100'}
                `}
                aria-expanded={!isViewControlsCollapsed}
            >
                {/* Grid Toggle */}
                <Toggle
                    onClick={handleToggleGrid}
                    aria-label={showGrid ? 'Hide grid (G)' : 'Show grid (G)'}
                    aria-pressed={showGrid}
                    title={showGrid ? 'Hide grid (G)' : 'Show grid (G)'}
                    className={`
                        p-2 rounded-md border
                        transition-all duration-150 ease-out
                        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                        ${showGrid 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                        }
                    `}
                >
                    <Grid3X3 className="w-4 h-4" aria-hidden="true" />
                </Toggle>

                {/* Snap to Grid Toggle */}
                <Toggle
                    onClick={handleToggleSnap}
                    aria-label={snapToGrid ? 'Disable snap to grid (S)' : 'Enable snap to grid (S)'}
                    aria-pressed={snapToGrid}
                    title={snapToGrid ? 'Disable snap to grid (S)' : 'Enable snap to grid (S)'}
                    className={`
                        p-2 rounded-md border
                        transition-all duration-150 ease-out
                        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                        ${snapToGrid 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                        }
                    `}
                >
                    <Magnet className="w-4 h-4" aria-hidden="true" />
                </Toggle>

                {/* Divider */}
                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

                {/* Minimap Toggle */}
                <Toggle
                    onClick={handleToggleMinimap}
                    aria-label={showMinimap ? 'Hide minimap (H)' : 'Show minimap (H)'}
                    aria-pressed={showMinimap}
                    title={showMinimap ? 'Hide minimap (H)' : 'Show minimap (H)'}
                    className={`
                        p-2 rounded-md border
                        transition-all duration-150 ease-out
                        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                        ${showMinimap 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                        }
                    `}
                >
                    {showMinimap ? (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                    ) : (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                    )}
                </Toggle>
            </Card>

            {/* Collapse Toggle Button (Chevron) */}
            <Button
                onClick={handleToggleCollapse}
                aria-label={isViewControlsCollapsed ? 'Expand view controls' : 'Collapse view controls'}
                aria-expanded={!isViewControlsCollapsed}
                title={isViewControlsCollapsed ? 'Expand view controls' : 'Collapse view controls'}
                className="p-2 rounded-md bg-gray-100/90 dark:bg-zinc-800/90 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
            >
                {isViewControlsCollapsed ? (
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                ) : (
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                )}
            </Button>
        </div>
    );
};

export default ViewControls;
