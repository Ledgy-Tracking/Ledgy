import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ShortcutHelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShortcutCategory {
    name: string;
    shortcuts: {
        keys: string;
        description: string;
    }[];
}

const shortcutCategories: ShortcutCategory[] = [
    {
        name: 'Navigation',
        shortcuts: [
            { keys: 'Space + Drag', description: 'Pan canvas' },
            { keys: '↑ ↓ ← →', description: 'Nudge pan (10px, 50px with Shift)' },
            { keys: 'Page Up/Down', description: 'Pan vertically by viewport height' },
            { keys: 'Home', description: 'Center on first node' },
            { keys: 'End', description: 'Center on last node' },
        ],
    },
    {
        name: 'Zoom',
        shortcuts: [
            { keys: '+ or =', description: 'Zoom in' },
            { keys: '-', description: 'Zoom out' },
            { keys: '0', description: 'Reset zoom to 100%' },
            { keys: 'Shift + 1', description: 'Fit to screen' },
            { keys: 'Ctrl/Cmd + +', description: 'Zoom in (alternative)' },
            { keys: 'Ctrl/Cmd + -', description: 'Zoom out (alternative)' },
            { keys: 'Ctrl/Cmd + 0', description: 'Reset zoom (alternative)' },
        ],
    },
    {
        name: 'View Controls',
        shortcuts: [
            { keys: 'H', description: 'Toggle minimap' },
            { keys: 'G', description: 'Toggle grid' },
            { keys: 'S', description: 'Toggle snap to grid' },
        ],
    },
    {
        name: 'Help',
        shortcuts: [
            { keys: '?', description: 'Show/hide this help panel' },
            { keys: 'Escape', description: 'Close help panel' },
        ],
    },
];

/**
 * ShortcutHelpPanel - Modal dialog showing all keyboard shortcuts
 * 
 * Features:
 * - Opens with ? key
 * - Closes with Escape or click outside
 * - Focus trap while open
 * - Categorized shortcuts display
 */
export const ShortcutHelpPanel: React.FC<ShortcutHelpPanelProps> = ({ isOpen, onClose }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Focus trap, escape key handling, and focus restoration
    useEffect(() => {
        if (!isOpen) return;

        // Store previously focused element
        const previousFocus = document.activeElement as HTMLElement | null;

        // Focus the close button when opening
        closeButtonRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            // Focus trap with Tab key
            if (e.key === 'Tab') {
                const focusableElements = panelRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusableElements || focusableElements.length === 0) return;

                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                const activeElement = document.activeElement;

                if (e.shiftKey) {
                    // Shift+Tab: if at first element, wrap to last
                    if (activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab: if at last element, wrap to first
                    if (activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';

            // Restore focus to previous element
            if (previousFocus && 'focus' in previousFocus) {
                previousFocus.focus();
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 dark:bg-black/50 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcut-help-title"
            >
                <Card
                    ref={panelRef}
                    className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl"
                >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <Keyboard className="w-6 h-6 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
                        <h2 
                            id="shortcut-help-title" 
                            className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
                        >
                            Keyboard Shortcuts
                        </h2>
                    </div>
                    <Button
                        ref={closeButtonRef}
                        onClick={onClose}
                        aria-label="Close help panel"
                        className="
                            p-2 rounded-md
                            text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100
                            hover:bg-zinc-100 dark:hover:bg-zinc-800
                            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900
                            transition-colors
                        "
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </Button>
                </div>

                {/* Shortcuts Grid */}
                <ScrollArea className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {shortcutCategories.map((category) => (
                        <Card key={category.name}>
                            <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
                                {category.name}
                            </h3>
                            <div className="space-y-2">
                                {category.shortcuts.map((shortcut, index) => (
                                    <div 
                                        key={index}
                                        className="flex items-center justify-between py-1.5"
                                    >
                                        <span className="text-zinc-700 dark:text-zinc-300 text-sm">
                                            {shortcut.description}
                                        </span>
                                        <kbd className="
                                            px-2 py-1 text-xs font-mono
                                            bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
                                            border border-zinc-300 dark:border-zinc-700 rounded
                                            whitespace-nowrap
                                        ">
                                            {shortcut.keys}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </ScrollArea>

                {/* Footer */}
                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-500">
                    Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-400">?</kbd> to toggle this panel anytime
                </div>
                </Card>
            </div>
        </Dialog>
    );
};

export default ShortcutHelpPanel;
