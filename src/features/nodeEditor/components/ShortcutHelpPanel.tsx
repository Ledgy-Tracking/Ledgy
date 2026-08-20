import React from 'react';
import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-6 border-b border-zinc-200 dark:border-zinc-800 text-left">
                    <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        <Keyboard className="w-6 h-6 text-emerald-600 dark:text-emerald-500" aria-hidden="true" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        List of keyboard shortcuts for the node editor.
                    </DialogDescription>
                </DialogHeader>

                {/* Shortcuts Grid */}
                <ScrollArea className="flex-1 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-500 shrink-0">
                    Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-400">?</kbd> to toggle this panel anytime
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShortcutHelpPanel;
