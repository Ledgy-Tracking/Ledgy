import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

export interface ConflictEntry {
    entryId: string;
    entryName: string;
    ledgerName: string;
    localVersion: {
        data: any;
        timestamp: string;
        deviceId: string;
    };
    remoteVersion: {
        data: any;
        timestamp: string;
        deviceId: string;
    };
    conflictingFields: string[];
}

interface ConflictListSheetProps {
    conflicts: ConflictEntry[];
    onSelectConflict: (conflict: ConflictEntry) => void;
    onClose: () => void;
}

/**
 * Conflict List Sheet - Shows all conflicted entries
 * Story 5-3: Conflict Detection & Diff Guard Layout
 */
export const ConflictListSheet: React.FC<ConflictListSheetProps> = ({
    conflicts,
    onSelectConflict,
    onClose,
}) => {
    if (conflicts.length === 0) {
        return (
            <div className="p-4 text-center text-zinc-500">
                <p className="text-sm">No conflicts to resolve</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Sync Conflicts ({conflicts.length})
                </h2>
                <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon-xs"
                    className="text-zinc-400 hover:text-zinc-800 dark:text-zinc-200"
                    aria-label="Close Sync Conflicts"
                >
                    <X size={16} />
                </Button>
            </div>

            {/* Conflict List */}
            <ScrollArea className="flex-1 p-4 space-y-2">
                {conflicts.map((conflict, index) => (
                    <Button
                        key={index}
                        onClick={() => onSelectConflict(conflict)}
                        variant="secondary"
                        className="w-full h-auto p-3 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:border-zinc-600 text-left justify-between"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                    {conflict.entryName}
                                </div>
                                <div className="text-xs text-zinc-500 mt-0.5">
                                    {conflict.ledgerName}
                                </div>
                                <div className="text-xs text-amber-400 mt-1">
                                    {conflict.conflictingFields.length} field(s) differ
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-zinc-500 shrink-0" />
                        </div>

                        {/* Timestamps */}
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
                            <span>
                                Local: {new Date(conflict.localVersion.timestamp).toLocaleString()}
                            </span>
                            <span>•</span>
                            <span>
                                Remote: {new Date(conflict.remoteVersion.timestamp).toLocaleString()}
                            </span>
                        </div>
                    </Button>
                ))}
            </ScrollArea>

            {/* Footer */}
            <Card className="rounded-none border-t-0 border-x-0 border-b border-zinc-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                <CardContent className="px-4 py-3">
                    <p className="text-xs text-zinc-500">
                        Select a conflict to review and resolve differences
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};
