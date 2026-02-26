import React, { useState, useEffect, useMemo } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerEntry, SchemaField } from '../../types/ledger';
import { InlineEntryRow } from './InlineEntryRow';
import { RelationTagChip } from './RelationTagChip';
import { BackLinksPanel } from './BackLinksPanel';
import { Button } from '../../components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';

interface LedgerTableProps {
    schemaId: string;
    highlightEntryId?: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ schemaId, highlightEntryId }) => {
    const { schemas, entries, fetchEntries, allEntries, deleteEntry } = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<number>(-1);

    const schema = schemas.find(s => s._id === schemaId);

    // Memoized set of deleted entry IDs for efficient ghost detection (Story 3-4)
    const deletedEntryIds = useMemo(() => {
        const deleted = new Set<string>();
        Object.values(allEntries).forEach(ledgerEntries => {
            ledgerEntries.forEach(entry => {
                if (entry.isDeleted) {
                    deleted.add(entry._id);
                }
            });
        });
        return deleted;
    }, [allEntries]);

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

    // Keyboard navigation (Story 3-2, AC 3)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
                return; // Don't steal focus from inputs
            }

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                setIsAddingEntry(true);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedRow(prev => Math.min(prev + 1, ledgerEntries.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedRow(prev => Math.max(prev - 1, 0));
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRow >= 0) {
                e.preventDefault();
                const entryToDelete = ledgerEntries[selectedRow];
                if (entryToDelete && confirm(`Are you sure you want to delete this entry?`)) {
                    deleteEntry(entryToDelete._id);
                    setSelectedRow(-1);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ledgerEntries, selectedRow, deleteEntry]);

    if (!schema) {
        return <div className="p-4 text-zinc-500 dark:text-zinc-500">Schema not found</div>;
    }

    return (
        <div className="w-full h-full flex flex-col" aria-label={`${schema.name} entries`}>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="flex items-center justify-between p-3">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{schema.name}</h2>
                    <Button
                        onClick={() => setIsAddingEntry(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                        size="sm"
                        aria-label="Add new entry"
                    >
                        Add Entry (N)
                    </Button>
                </div>
            </div>

            {/* Content area: Table + Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Table */}
                <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950">
                    <Table>
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10">
                            <TableRow>
                                {schema.fields.map((field) => (
                                    <TableHead key={field.name} className="whitespace-nowrap">
                                        {field.name}
                                        <span className="ml-1 text-zinc-400 dark:text-zinc-500 font-normal">({field.type})</span>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
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
                                <TableRow>
                                    <TableCell colSpan={schema.fields.length} className="text-center h-32">
                                        <div className="flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                                            <p className="mb-2">No entries yet.</p>
                                            <p className="text-sm">Press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-900 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">N</kbd> or click "Add Entry" to create your first entry.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* Entry Rows */}
                            {ledgerEntries.map((entry, index) => {
                                const isHighlighted = highlightEntryId && entry._id === highlightEntryId;
                                const isEditing = editingEntryId === entry._id;
                                const isSelected = selectedRow === index;

                                if (isEditing) {
                                    return (
                                        <InlineEntryRow
                                            key={entry._id}
                                            schema={schema}
                                            entry={entry}
                                            onCancel={() => setEditingEntryId(null)}
                                            onComplete={() => setEditingEntryId(null)}
                                        />
                                    );
                                }

                                return (
                                    <TableRow
                                        key={entry._id}
                                        data-state={isSelected ? "selected" : undefined}
                                        className={`cursor-pointer transition-colors ${isHighlighted ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' : ''
                                            }`}
                                        onClick={() => setSelectedRow(index)}
                                        onDoubleClick={() => setEditingEntryId(entry._id)}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setEditingEntryId(entry._id);
                                            }
                                        }}
                                    >
                                        {schema.fields.map(field => (
                                            <TableCell key={`${entry._id}-${field.name}`}>
                                                {renderFieldValue(entry.data[field.name], field.type, entry, field, deletedEntryIds)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Split View for Back-links (Story 3-3, AC 4) */}
                {selectedEntry && (
                    <div className="w-[300px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-y-auto">
                        <BackLinksPanel
                            targetEntryId={selectedEntry._id}
                            targetLedgerId={schemaId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

function renderFieldValue(value: unknown, type: string, entry?: LedgerEntry, field?: SchemaField, deletedEntryIds?: Set<string>): React.ReactNode {
    if (value === null || value === undefined || value === '') {
        return <span className="text-zinc-400 dark:text-zinc-600 italic">-</span>;
    }

    switch (type) {
        case 'date':
            return new Date(value as string).toLocaleDateString();
        case 'number':
            return typeof value === 'number' ? value.toLocaleString() : String(value);
        case 'relation':
            // Check if target entries are deleted (ghost references - Story 3-4)
            const values = Array.isArray(value) ? value as string[] : [value as string];
            const hasDeletedTarget = values.some(v => deletedEntryIds?.has(v));

            // Render as Tag Chip with navigation (Story 3-3)
            return (
                <RelationTagChip
                    value={value as string | string[]}
                    targetLedgerId={field?.relationTarget}
                    entryId={entry?._id}
                    isGhost={hasDeletedTarget}
                />
            );
        default:
            return String(value);
    }
}
