import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useUIStore } from '../../stores/useUIStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerEntry, SchemaField } from '../../types/ledger';
import { InlineEntryRow } from './InlineEntryRow';
import { RelationTagChip } from './RelationTagChip';
import { BackLinksPanel } from './BackLinksPanel';
import { Button } from '../../components/ui/button';

interface LedgerTableProps {
    schemaId: string;
    highlightEntryId?: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ schemaId, highlightEntryId }) => {
    const { schemas, entries, fetchEntries, allEntries, deleteEntry } = useLedgerStore();
    const { activeProfileId } = useProfileStore();
    const { setSelectedEntryId, setRightInspector } = useUIStore();
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<number>(-1);
    const [recentlyCommittedId, setRecentlyCommittedId] = useState<string | null>(null);
    const [pendingDeleteEntry, setPendingDeleteEntry] = useState<LedgerEntry | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pendingDeleteRef = useRef<LedgerEntry | null>(null);
    pendingDeleteRef.current = pendingDeleteEntry;

    const schema = schemas.find(s => s._id === schemaId);

    // Memoized set of deleted entry IDs for efficient ghost detection (Story 3-4)
    // Scoped to relation target schemas only — avoids scanning all schemas on each render
    const deletedEntryIds = useMemo(() => {
        const deleted = new Set<string>();
        if (!schema) return deleted;
        const relationTargetIds = schema.fields
            .filter(f => f.type === 'relation' && f.relationTarget)
            .map(f => f.relationTarget!);
        relationTargetIds.forEach(targetSchemaId => {
            (allEntries[targetSchemaId] || []).forEach(entry => {
                if (entry.isDeleted) {
                    deleted.add(entry._id);
                }
            });
        });
        return deleted;
    }, [allEntries, schema]);

    useEffect(() => {
        if (activeProfileId && schemaId) {
            fetchEntries(activeProfileId, schemaId);
        }
    }, [activeProfileId, schemaId, fetchEntries]);

    const ledgerEntries = entries[schemaId] || [];
    const selectedEntry = selectedRow >= 0 ? ledgerEntries[selectedRow] : null;

    const rowVirtualizer = useVirtualizer({
        count: ledgerEntries.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => 36,
        overscan: 10,
    });

    // Keep a stable ref to the latest virtualizer instance for use inside the keyboard handler closure
    const rowVirtualizerRef = useRef(rowVirtualizer);
    rowVirtualizerRef.current = rowVirtualizer;

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
                const next = Math.min(selectedRow + 1, ledgerEntries.length - 1);
                setSelectedRow(next);
                rowVirtualizerRef.current.scrollToIndex(next, { align: 'auto' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const next = Math.max(selectedRow - 1, 0);
                setSelectedRow(next);
                rowVirtualizerRef.current.scrollToIndex(next, { align: 'auto' });
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRow >= 0) {
                e.preventDefault();
                const entryToDelete = ledgerEntries[selectedRow];
                if (entryToDelete) {
                    setPendingDeleteEntry(entryToDelete);
                }
            } else if (e.key === 'Enter' && pendingDeleteRef.current) {
                e.preventDefault();
                const entry = pendingDeleteRef.current;
                deleteEntry(entry._id);
                setSelectedRow(-1);
                setPendingDeleteEntry(null);
            } else if (e.key === 'Escape' && pendingDeleteRef.current) {
                e.preventDefault();
                setPendingDeleteEntry(null);
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
                {pendingDeleteEntry && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 text-sm">
                        <span className="flex-1 text-red-700 dark:text-red-300">
                            Delete this entry? Press{' '}
                            <kbd className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded font-mono text-xs border border-red-300 dark:border-red-700">Enter</kbd>
                            {' '}to confirm or{' '}
                            <kbd className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded font-mono text-xs border border-red-300 dark:border-red-700">Esc</kbd>
                            {' '}to cancel.
                        </span>
                        <button
                            onClick={() => {
                                deleteEntry(pendingDeleteEntry._id);
                                setSelectedRow(-1);
                                setPendingDeleteEntry(null);
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => setPendingDeleteEntry(null)}
                            className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded text-xs font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Content area: virtualized grid + split view */}
            <div className="flex-1 flex overflow-hidden">
                {/* Grid column: role="grid" wraps BOTH the sticky header and the scroll body (WCAG 2.1 AA grid pattern) */}
                <div
                    role="grid"
                    aria-label={`${schema.name} data grid`}
                    className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950"
                >
                    {/* Sticky column header — role="rowgroup" is inside role="grid" per WCAG */}
                    <div
                        role="rowgroup"
                        className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0"
                    >
                        <div role="row" className="flex">
                            {schema.fields.map((field) => (
                                <div
                                    key={field.name}
                                    role="columnheader"
                                    className="flex-1 min-w-0 px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap overflow-hidden"
                                >
                                    {field.name}
                                    <span className="ml-1 font-normal normal-case text-zinc-400 dark:text-zinc-500">
                                        ({field.type})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable virtualizer body — scroll element for useVirtualizer; no role needed here */}
                    <div
                        ref={scrollContainerRef}
                        style={{ overflowY: 'auto', flex: 1 }}
                    >
                        {/* Inline add-entry row — rendered OUTSIDE the virtualizer loop */}
                        {isAddingEntry && (
                            <div>
                                <InlineEntryRow
                                    schema={schema}
                                    onCancel={() => setIsAddingEntry(false)}
                                    onComplete={(id?: string) => {
                                        setIsAddingEntry(false);
                                        if (id) {
                                            setRecentlyCommittedId(id);
                                            setTimeout(() => setRecentlyCommittedId(null), 2000);
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* Empty state */}
                        {ledgerEntries.length === 0 && !isAddingEntry && (() => {
                            const allEntriesForSchema = allEntries[schemaId] || [];
                            const allSoftDeleted = allEntriesForSchema.length > 0;
                            return (
                                <div className="flex flex-col items-center justify-center h-32 text-zinc-500 dark:text-zinc-400">
                                    {allSoftDeleted ? (
                                        <>
                                            <p className="mb-2">All entries have been deleted.</p>
                                            <p className="text-sm">Deleted entries can be recovered from the entry inspector.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="mb-2">No entries yet.</p>
                                            <p className="text-sm">
                                                Press{' '}
                                                <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-900 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                                    N
                                                </kbd>{' '}
                                                or click "Add Entry" to create your first entry.
                                            </p>
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Virtualizer total-height spacer with absolute-positioned virtual rows */}
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const entry = ledgerEntries[virtualRow.index];
                                const isEditing = editingEntryId === entry._id;
                                const isHighlighted = highlightEntryId && entry._id === highlightEntryId;
                                const isSelected = selectedRow === virtualRow.index;

                                return (
                                    <div
                                        key={entry._id}
                                        role="row"
                                        data-state={isSelected ? 'selected' : undefined}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                        className={`flex border-b border-zinc-100 dark:border-zinc-800 cursor-pointer transition-all duration-300 ${
                                            isHighlighted
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                : recentlyCommittedId === entry._id
                                                ? 'bg-emerald-500/20 dark:bg-emerald-500/20 ring-1 ring-emerald-500/50 animate-slide-down-row'
                                                : isSelected
                                                ? 'bg-zinc-100 dark:bg-zinc-800'
                                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                        }`}
                                        onClick={() => {
                                            setSelectedRow(virtualRow.index);
                                            setSelectedEntryId(entry._id);
                                            setRightInspector(true);
                                        }}
                                        onDoubleClick={() => setEditingEntryId(entry._id)}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setEditingEntryId(entry._id);
                                            }
                                        }}
                                    >
                                        {isEditing ? (
                                            <InlineEntryRow
                                                schema={schema}
                                                entry={entry}
                                                onCancel={() => setEditingEntryId(null)}
                                                onComplete={() => {
                                                    setEditingEntryId(null);
                                                    // Flash only fires for new entries (add mode), not edits
                                                }}
                                            />
                                        ) : (
                                            schema.fields.map((field) => (
                                                <div
                                                    key={`${entry._id}-${field.name}`}
                                                    role="gridcell"
                                                    className="flex-1 min-w-0 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 overflow-hidden text-ellipsis whitespace-nowrap"
                                                >
                                                    {renderFieldValue(entry.data[field.name], field.type, entry, field, deletedEntryIds)}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
