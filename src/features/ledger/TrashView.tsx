import React, { useEffect, useState } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerEntry, LedgerSchema } from '../../types/ledger';
import { Trash2, RotateCcw, Archive } from 'lucide-react';

/**
 * Trash view for displaying and restoring soft-deleted entries.
 * Implements Story 3-4, AC 4: Restore Functionality.
 */
export const TrashView: React.FC = () => {
    const { activeProfileId } = useProfileStore();
    const { schemas, allEntries, fetchSchemas, fetchEntries, restoreEntry } = useLedgerStore();
    const [deletedEntries, setDeletedEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadDeletedEntries = async () => {
            if (!activeProfileId) return;

            setIsLoading(true);
            try {
                // Fetch all schemas first
                await fetchSchemas(activeProfileId);

                // Fetch entries for each schema to get soft-deleted ones
                for (const schema of schemas) {
                    await fetchEntries(activeProfileId, schema._id);
                }
            } catch (error) {
                console.error('Failed to load deleted entries:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDeletedEntries();
    }, [activeProfileId]);

    // Collect all soft-deleted entries from allEntries
    useEffect(() => {
        const deleted: LedgerEntry[] = [];
        Object.values(allEntries).forEach((entries) => {
            entries.forEach((entry) => {
                if (entry.isDeleted) {
                    deleted.push(entry);
                }
            });
        });
        setDeletedEntries(deleted);
    }, [allEntries]);

    const handleRestore = async (entryId: string) => {
        if (!activeProfileId) return;

        try {
            await restoreEntry(entryId);
        } catch (error) {
            console.error('Failed to restore entry:', error);
        }
    };

    const getSchemaName = (ledgerId: string): string => {
        const schema = schemas.find((s) => s._id === ledgerId);
        return schema?.name || ledgerId;
    };

    const getEntryDisplayValue = (entry: LedgerEntry, schema?: LedgerSchema): string => {
        if (!schema || schema.fields.length === 0) {
            return entry._id.slice(-8);
        }
        const firstFieldName = schema.fields[0].name;
        const value = entry.data[firstFieldName];
        return value ? String(value) : entry._id.slice(-8);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-zinc-500">Loading trash...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                <Trash2 size={20} className="text-zinc-400" />
                <h1 className="text-lg font-semibold">Trash</h1>
                <span className="text-sm text-zinc-500 ml-2">
                    ({deletedEntries.length} deleted {deletedEntries.length === 1 ? 'entry' : 'entries'})
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {deletedEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <Archive size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Trash is empty</p>
                        <p className="text-sm mt-1">Deleted entries will appear here</p>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
                            {/* Table Header */}
                            <div className="flex border-b border-zinc-800 bg-zinc-800/50 text-xs font-medium text-zinc-400">
                                <div className="flex-1 px-3 py-2 text-left">Entry</div>
                                <div className="w-40 px-3 py-2 text-left">Ledger</div>
                                <div className="w-48 px-3 py-2 text-left">Deleted At</div>
                                <div className="w-24 px-3 py-2 text-center">Actions</div>
                            </div>

                            {/* Deleted Entries */}
                            {deletedEntries.map((entry) => {
                                const schema = schemas.find(
                                    (s) => s._id === entry.ledgerId
                                );
                                const deletedAt = entry.deletedAt
                                    ? new Date(entry.deletedAt).toLocaleString()
                                    : 'Unknown';

                                return (
                                    <div
                                        key={entry._id}
                                        className="flex border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors last:border-b-0"
                                    >
                                        <div className="flex-1 px-3 py-3 text-sm text-zinc-300">
                                            <span className="line-through text-zinc-500">
                                                {getEntryDisplayValue(entry, schema)}
                                            </span>
                                        </div>
                                        <div className="w-40 px-3 py-3 text-sm text-zinc-400">
                                            {getSchemaName(entry.ledgerId)}
                                        </div>
                                        <div className="w-48 px-3 py-3 text-sm text-zinc-500">
                                            {deletedAt}
                                        </div>
                                        <div className="w-24 px-3 py-2 flex items-center justify-center">
                                            <button
                                                onClick={() => handleRestore(entry._id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded font-bold transition-colors"
                                                title="Restore entry"
                                            >
                                                <RotateCcw size={12} />
                                                Restore
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
