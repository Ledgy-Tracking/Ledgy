import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { NodeInspector } from './NodeInspector';
import { EntryInspector } from './EntryInspector';
import { Info, X } from 'lucide-react';

export const Inspector: React.FC = () => {
    const { selectedNodeId, selectedEntryId, setRightInspector } = useUIStore();

    const hasSelection = !!selectedNodeId || !!selectedEntryId;

    return (
        <aside className="h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
            {/* Header / Tabs if multiple? For now just dynamic content */}
            <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Info size={16} className="text-zinc-400" />
                    Inspector
                </span>
                <button
                    onClick={() => setRightInspector(false)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                {!hasSelection ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                            <Info size={24} className="opacity-20" />
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">Nothing Selected</p>
                        <p className="text-xs text-zinc-500">Select a node or entry to view its properties.</p>
                    </div>
                ) : selectedNodeId ? (
                    <NodeInspector />
                ) : (
                    <EntryInspector />
                )}
            </div>
        </aside>
    );
};
