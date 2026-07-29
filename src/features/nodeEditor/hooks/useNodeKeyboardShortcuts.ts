import { useEffect, useCallback, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useNodeStore } from '../../../stores/useNodeStore';

interface UseNodeKeyboardShortcutsOptions {
    onOpenHelp?: () => void;
}

/**
 * useNodeKeyboardShortcuts - Hook for canvas keyboard navigation
 * 
 * Features:
 * - Space + Drag: Pan canvas
 * - +/-: Zoom in/out with announcements
 * - 0: Reset zoom
 * - Shift+1: Fit to screen
 * - H: Toggle minimap
 * - G: Toggle grid
 * - S: Toggle snap to grid
 * - ?: Show shortcuts help
 * - Arrow keys: Nudge pan
 * 
 * Accessibility:
 * - ARIA live announcements (throttled to prevent spam)
 * - Prevents shortcuts when typing in inputs
 */
export const useNodeKeyboardShortcuts = (options: UseNodeKeyboardShortcutsOptions = {}) => {
    const { onOpenHelp } = options;
    const reactFlow = useReactFlow();
    
    // View controls selectors
    const setShowMinimap = useNodeStore(s => s.setShowMinimap);
    const setShowGrid = useNodeStore(s => s.setShowGrid);
    const setSnapToGrid = useNodeStore(s => s.setSnapToGrid);
    const viewControls = useNodeStore(s => s.viewControls);
    const nodeCount = useNodeStore(s => s.nodes.length);
    
    const { showMinimap, showGrid, snapToGrid } = viewControls;
    
    // Announcement state for ARIA live region
    const [announcement, setAnnouncement] = useState('');
    const announcementTimeout = useRef<number | null>(null);
    
    // Throttle announcements to prevent spam
    const announce = useCallback((message: string) => {
        if (announcementTimeout.current) {
            window.clearTimeout(announcementTimeout.current);
        }
        setAnnouncement(message);
        announcementTimeout.current = window.setTimeout(() => {
            setAnnouncement('');
        }, 500);
    }, []);
    
    // Check if user is typing in an input
    const isTyping = useCallback((target: EventTarget | null): boolean => {
        if (!target) return false;
        const element = target as HTMLElement;
        const typingRoles = ['textbox', 'searchbox', 'combobox', 'spinbutton'];
        return (
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ||
            element.isContentEditable ||
            typingRoles.includes(element.getAttribute('role') || '')
        );
    }, []);

    useEffect(() => {
        // Defensive: ensure React Flow is available
        if (!reactFlow) return;

        const { zoomIn, zoomOut, fitView, setViewport } = reactFlow;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger when typing in inputs
            if (isTyping(event.target)) {
                return;
            }

            const key = event.key;
            
            // Handle shortcuts
            switch (key) {
                // Zoom In: +, =, NumpadAdd
                case '=':
                case '+':
                case 'NumpadAdd':
                    event.preventDefault();
                    zoomIn({ duration: 200 });
                    // Announce target zoom (current + 0.2) since animation is async
                    const currentZoomIn = reactFlow.getZoom();
                    const targetZoomIn = Math.min(2.0, currentZoomIn + 0.2);
                    setTimeout(() => {
                        announce(`Zoom: ${Math.round(targetZoomIn * 100)}%`);
                    }, 250);
                    break;

                // Zoom Out: -, NumpadSubtract
                case '-':
                case 'NumpadSubtract':
                    event.preventDefault();
                    zoomOut({ duration: 200 });
                    // Announce target zoom (current - 0.2) since animation is async
                    const currentZoomOut = reactFlow.getZoom();
                    const targetZoomOut = Math.max(0.1, currentZoomOut - 0.2);
                    setTimeout(() => {
                        announce(`Zoom: ${Math.round(targetZoomOut * 100)}%`);
                    }, 250);
                    break;

                // Reset Zoom: 0, Numpad0
                case '0':
                case 'Numpad0':
                    // Don't trigger if Shift is pressed (Shift+0 is different)
                    if (!event.shiftKey) {
                        event.preventDefault();
                        setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
                        announce('Zoom: 100%');
                    }
                    break;

                // Fit to Screen: Shift+1
                case '1':
                    if (event.shiftKey) {
                        event.preventDefault();
                        if (nodeCount > 0) {
                            fitView({ padding: 0.2, duration: 300 });
                            announce('Fit to screen');
                        }
                    }
                    break;

                // Toggle Minimap: H
                case 'h':
                case 'H':
                    event.preventDefault();
                    setShowMinimap(!showMinimap);
                    announce(showMinimap ? 'Minimap hidden' : 'Minimap visible');
                    break;

                // Toggle Grid: G
                case 'g':
                case 'G':
                    event.preventDefault();
                    setShowGrid(!showGrid);
                    announce(showGrid ? 'Grid hidden' : 'Grid visible');
                    break;

                // Toggle Snap to Grid: S
                case 's':
                case 'S':
                    // Only trigger if not in combination with ctrl/cmd/alt (save shortcut modifiers)
                    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                        event.preventDefault();
                        setSnapToGrid(!snapToGrid);
                        announce(snapToGrid ? 'Snap to grid off' : 'Snap to grid on');
                    }
                    break;

                // Show Help: ?
                case '?':
                    event.preventDefault();
                    onOpenHelp?.();
                    break;

                // Arrow keys: Nudge pan
                case 'ArrowUp':
                    event.preventDefault();
                    {
                        const current = reactFlow.getViewport();
                        const amount = event.shiftKey ? 50 : 10;
                        setViewport({ ...current, y: current.y + amount }, { duration: 100 });
                    }
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    {
                        const current = reactFlow.getViewport();
                        const amount = event.shiftKey ? 50 : 10;
                        setViewport({ ...current, y: current.y - amount }, { duration: 100 });
                    }
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    {
                        const current = reactFlow.getViewport();
                        const amount = event.shiftKey ? 50 : 10;
                        setViewport({ ...current, x: current.x + amount }, { duration: 100 });
                    }
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    {
                        const current = reactFlow.getViewport();
                        const amount = event.shiftKey ? 50 : 10;
                        setViewport({ ...current, x: current.x - amount }, { duration: 100 });
                    }
                    break;

                // Page Up/Down: Pan vertically by viewport height
                case 'PageUp':
                    event.preventDefault();
                    {
                        const current = reactFlow.getViewport();
                        const height = window.innerHeight / current.zoom;
                        setViewport({ ...current, y: current.y + height * 0.5 }, { duration: 200 });
                    }
                    break;
                case 'PageDown':
                    event.preventDefault();
                    {
                        const current = reactFlow.getViewport();
                        const height = window.innerHeight / current.zoom;
                        setViewport({ ...current, y: current.y - height * 0.5 }, { duration: 200 });
                    }
                    break;

                // Home: Center on first node
                case 'Home':
                    event.preventDefault();
                    if (nodeCount > 0) {
                        const currentNodes = useNodeStore.getState().nodes;
                        const firstNode = currentNodes[0];
                        setViewport({
                            x: -firstNode.position.x + window.innerWidth / 2 / reactFlow.getZoom() - 100,
                            y: -firstNode.position.y + window.innerHeight / 2 / reactFlow.getZoom() - 50,
                            zoom: reactFlow.getZoom()
                        }, { duration: 300 });
                    }
                    break;

                // End: Center on last node
                case 'End':
                    event.preventDefault();
                    if (nodeCount > 0) {
                        const currentNodes = useNodeStore.getState().nodes;
                        const lastNode = currentNodes[currentNodes.length - 1];
                        setViewport({
                            x: -lastNode.position.x + window.innerWidth / 2 / reactFlow.getZoom() - 100,
                            y: -lastNode.position.y + window.innerHeight / 2 / reactFlow.getZoom() - 50,
                            zoom: reactFlow.getZoom()
                        }, { duration: 300 });
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (announcementTimeout.current) {
                window.clearTimeout(announcementTimeout.current);
            }
        };
    }, [
        reactFlow, 
        onOpenHelp, 
        showMinimap, 
        showGrid, 
        snapToGrid, 
        nodeCount,
        setShowMinimap, 
        setShowGrid, 
        setSnapToGrid, 
        announce, 
        isTyping
    ]);

    return { announcement };
};

export default useNodeKeyboardShortcuts;
