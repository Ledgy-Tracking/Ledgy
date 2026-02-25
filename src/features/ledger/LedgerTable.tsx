import React, { useState, useEffect } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerSchema, LedgerEntry, SchemaField } from '../../types/ledger';
import { InlineEntryRow } from './InlineEntryRow';
import { RelationTagChip } from './RelationTagChip';
import { BackLinksPanel } from './BackLinksPanel';

interface LedgerTableProps {
    schemaId: string;
    highlightEntryId?: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ schemaId, highlightEntryId }) => {
    const { schemas, entries, fetchEntries, allEntries } = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [selectedRow, setSelectedRow] = useState<number>(-1);

    const schema = schemas.find(s => s._id === schemaId);

    useEffect(() => {
        if (activeProfileId && schemaId) {
            fetchEntries(activeProfileId, schemaId);
        }
    }, [activeProfileId, schemaId, fetchEntries]);

    const ledgerEntries = entries[schemaId] || [];
    const selectedEntry = selectedRow >= 0 ? ledgerEntries[selectedRow] : null;

    // Auto-select highlighted entry on mount (Story 3-3, AC 5)
    useEffect(() => {
        if (highlightEntryId && ledgerEntries.length > 0) {
            const index = ledgerEntries.findIndex(e => e._id === highlightEntryId);
            if (index >= 0) {
                setSelectedRow(index);
            }
        }
    }, [highlightEntryId, ledgerEntries]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // N key - new entry
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                setIsAddingEntry(true);
            }

            // Arrow key navigation
            if (e.key === 'ArrowDown' && selectedRow < ledgerEntries.length - 1) {
                e.preventDefault();
                setSelectedRow(selectedRow + 1);
            }
            if (e.key === 'ArrowUp' && selectedRow > 0) {
                e.preventDefault();
                setSelectedRow(selectedRow - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ledgerEntries.length, selectedRow]);

    if (!schema) {
        return <div className="p-4 text-zinc-500">Schema not found</div>;
    }

    return (
        <div className="w-full overflow-auto" role="grid" aria-label={`${schema.name} entries`}>
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center justify-between p-3">
                    <h2 className="text-lg font-semibold text-zinc-50">{schema.name}</h2>
                    <button
                        onClick={() => setIsAddingEntry(true)}
                        className="px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded font-bold transition-colors"
                        aria-label="Add new entry"
                    >
                        Add Entry (N)
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="min-w-full">
                {/* Column Headers */}
                <div className="flex border-b border-zinc-800 bg-zinc-800/50 text-xs font-medium text-zinc-400">
                    {schema.fields.map((field, index) => (
                        <div
                            key={field.name}
                            className="flex-1 px-3 py-2 text-left border-r border-zinc-800 last:border-r-0"
                            role="columnheader"
                        >
                            {field.name}
                            <span className="ml-1 text-zinc-600">({field.type})</span>
                        </div>
                    ))}
                </div>

                {/* Inline Add Row */}
                {isAddingEntry && (
                    <InlineEntryRow
                        schema={schema}
                        onCancel={() => setIsAddingEntry(false)}
                        onComplete={() => setIsAddingEntry(false)}
                    />
                )}

                {/* Empty State */}
                {ledgerEntries.length === 0 && !isAddingEntry && (
                    <div className="p-8 text-center text-zinc-500">
                        <p className="mb-2">No entries yet.</p>
                        <p className="text-sm text-zinc-600">Press <kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">N</kbd> to create your first entry</p>
                    </div>
                )}

                {/* Entry Rows */}
                {ledgerEntries.map((entry, index) => {
                    const isHighlighted = highlightEntryId && entry._id === highlightEntryId;
                    return (
                        <div
                            key={entry._id}
                            className={`flex border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors ${selectedRow === index ? 'bg-zinc-800/50' : ''
                                } ${isHighlighted ? 'ring-2 ring-emerald-500/50 bg-emerald-900/10' : ''}`}
                            role="row"
                            onClick={() => setSelectedRow(index)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // Could trigger inline edit mode
                                }
                            }}
                        >
                            {schema.fields.map((field) => (
                                <div
                                    key={`${entry._id}-${field.name}`}
                                    className="flex-1 px-3 py-2.5 text-sm text-zinc-300 border-r border-zinc-800 last:border-r-0"
                                    role="gridcell"
                                >
                                    {renderFieldValue(entry.data[field.name], field.type, entry, field, schemaId, allEntries ? Object.values(allEntries).flat() : undefined)}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Back-Links Panel - Shows when entry is selected (Story 3-3, AC 4) */}
            {selectedEntry && (
                <BackLinksPanel
                    targetEntryId={selectedEntry._id}
                    targetLedgerId={schemaId}
                />
            )}
        </div>
    );
};

function renderFieldValue(value: unknown, type: string, entry?: LedgerEntry, field?: SchemaField, schemaId?: string, allEntries?: LedgerEntry[]): React.ReactNode {
    if (value === null || value === undefined) {
        return <span className="text-zinc-600 italic">-</span>;
    }

    switch (type) {
        case 'date':
            return new Date(value as string).toLocaleDateString();
        case 'number':
            return typeof value === 'number' ? value.toLocaleString() : String(value);
        case 'relation':
            // Check if target entries are deleted (ghost references - Story 3-4)
            const values = Array.isArray(value) ? value as string[] : [value as string];
            const deletedEntryIds = allEntries
                ? new Set(allEntries.filter(e => e.isDeleted).map(e => e._id))
                : new Set<string>();
            const hasDeletedTarget = values.some(v => deletedEntryIds.has(v));

            // Render as Tag Chip with navigation (Story 3-3)
            return (
                <RelationTagChip
                    value={value as string | string[]}
                    targetLedgerId={field?.relationTarget}
                    entryId={entry?._id}
                    isGhost={hasDeletedTarget}
                    onClick={() => {
                        // TODO: Navigate to target ledger (Story 3-3, Task 4)
                        console.log('Navigate to', field?.relationTarget);
                    }}
                />
            );
        default:
            return String(value);
    }
}
