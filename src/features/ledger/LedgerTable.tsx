// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useUIStore } from '../../stores/useUIStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerEntry, SchemaField, FlattenedEntry } from '../../types/ledger';
import { flattenEntries } from '../../lib/flattenRelations';
import { InlineEntryRow } from './InlineEntryRow';
import { RelationTagChip } from './RelationTagChip';
import { BackLinksPanel } from './BackLinksPanel';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AlertTriangle } from 'lucide-react';

type SortDirection = 'asc' | 'desc';

interface SortColumn {
    field: string;
    direction: SortDirection;
}

interface LedgerTableProps {
    schemaId: string;
    highlightEntryId?: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ schemaId, highlightEntryId }) => {
    const ledgerStore = useLedgerStore();
    const { schemas, entries, fetchEntries, allEntries, deleteEntry } = ledgerStore;
    const { activeProfileId } = useProfileStore();
    const { setSelectedEntryId, setRightInspector } = useUIStore();
    const selectedRowIds = ledgerStore.selectedRowIds ?? new Set<string>();
    const toggleRowSelection = ledgerStore.toggleRowSelection ?? (() => undefined);
    const selectAll = ledgerStore.selectAll ?? (() => undefined);
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<number>(-1);
    const [recentlyCommittedId, setRecentlyCommittedId] = useState<string | null>(null);
    const [pendingDeleteEntry, setPendingDeleteEntry] = useState<LedgerEntry | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pendingDeleteRef = useRef<LedgerEntry | null>(null);
    pendingDeleteRef.current = pendingDeleteEntry;
    const selectedRowRef = useRef(selectedRow);
    selectedRowRef.current = selectedRow;
    const isAddingEntryRef = useRef(isAddingEntry);
    isAddingEntryRef.current = isAddingEntry;
    const [sortConfig, setSortConfig] = useState<SortColumn[]>([]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const resizeState = useRef<{ field: string; startX: number; startWidth: number } | null>(null);
    const headerScrollRef = useRef<HTMLDivElement>(null);
    const lastClickedIndexRef = useRef<number | null>(null);

    const schema = useMemo(
        () => schemas.find(s => s._id === schemaId),
        [schemas, schemaId]
    );

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

    // Flatten entries pre-sort so relation columns can sort by resolved display values (AC #6, #7)
    // Use allEntries (includes target ledger entries) for cross-ledger relation resolution
    const flattenedLedgerEntries = useMemo(
        () => flattenEntries(
            ledgerEntries,
            schema,
            allEntries,
            Object.fromEntries(schemas.map(s => [s._id, s]))
        ),
        [ledgerEntries, schema, allEntries, schemas]
    );

    const sortedEntries = useMemo(() => {
        if (sortConfig.length === 0) return flattenedLedgerEntries;

        return [...flattenedLedgerEntries].sort((a, b) => {
            for (const { field, direction } of sortConfig) {
                const schemaField = schema?.fields.find(f => f.name === field);
                const aVal = a.data[field];
                const bVal = b.data[field];

                const aEmpty = aVal === null || aVal === undefined || aVal === '';
                const bEmpty = bVal === null || bVal === undefined || bVal === '';
                if (aEmpty && bEmpty) continue;
                if (aEmpty) return 1;
                if (bEmpty) return -1;

                let cmp = 0;
                switch (schemaField?.type) {
                    case 'number':
                        cmp = (aVal as number) - (bVal as number);
                        break;
                    case 'date':
                        // Lexicographic string comparison for ISO 8601 date strings
                        cmp = String(aVal) < String(bVal) ? -1 : String(aVal) > String(bVal) ? 1 : 0;
                        break;
                    case 'boolean':
                        cmp = (aVal ? 1 : 0) - (bVal ? 1 : 0);
                        break;
                    case 'relation': {
                        // Sort by resolved display value, falling back to raw UUID (AC #6)
                        const aResolved = a.resolvedRelations?.[field]?.[0]?.displayValue;
                        const bResolved = b.resolvedRelations?.[field]?.[0]?.displayValue;
                        const aFirst = aResolved ?? (Array.isArray(aVal) ? String(aVal[0] ?? '') : String(aVal));
                        const bFirst = bResolved ?? (Array.isArray(bVal) ? String(bVal[0] ?? '') : String(bVal));
                        cmp = aFirst.localeCompare(bFirst);
                        break;
                    }
                    default:
                        cmp = String(aVal).localeCompare(String(bVal));
                }

                if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
            }
            return 0;
        });
    }, [flattenedLedgerEntries, sortConfig, schema]);

    const selectedEntry = selectedRow >= 0 ? sortedEntries[selectedRow] : null;

    const rowVirtualizer = useVirtualizer({
        count: sortedEntries.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => 36,
        overscan: 10,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();
    const visibleRowIds = useMemo(
        () =>
            virtualItems
                .map((item) => sortedEntries[item.index]?._id)
                .filter((rowId): rowId is string => Boolean(rowId)),
        [virtualItems, sortedEntries]
    );
    const visibleSelectedCount = useMemo(
        () => visibleRowIds.filter((rowId) => selectedRowIds.has(rowId)).length,
        [visibleRowIds, selectedRowIds]
    );
    const allVisibleSelected = visibleRowIds.length > 0 && visibleSelectedCount === visibleRowIds.length;
    const isHeaderIndeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleRowIds.length;

    // Keep a stable ref to the latest virtualizer instance for use inside the keyboard handler closure
    const rowVirtualizerRef = useRef(rowVirtualizer);
    rowVirtualizerRef.current = rowVirtualizer;

    // Stable ref to sortedEntries for use inside the keyboard handler closure (avoids stale closure)
    const sortedEntriesRef = useRef(sortedEntries);
    sortedEntriesRef.current = sortedEntries;

    // Auto-select highlighted entry on mount (Story 3-3, AC 5)
    useEffect(() => {
        if (highlightEntryId && sortedEntries.length > 0) {
            const index = sortedEntries.findIndex(e => e._id === highlightEntryId);
            if (index >= 0) {
                setSelectedRow(index);
            }
        }
    }, [highlightEntryId, sortedEntries]);

    // Keyboard navigation (Story 3-2, AC 3)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
                return; // Don't steal focus from inputs
            }

            const currentRow = selectedRowRef.current;

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                if (!isAddingEntryRef.current) {
                    setIsAddingEntry(true);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = Math.min(currentRow + 1, sortedEntriesRef.current.length - 1);
                setSelectedRow(next);
                rowVirtualizerRef.current.scrollToIndex(next, { align: 'auto' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const next = Math.max(currentRow - 1, 0);
                setSelectedRow(next);
                rowVirtualizerRef.current.scrollToIndex(next, { align: 'auto' });
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && currentRow >= 0) {
                e.preventDefault();
                const entryToDelete = sortedEntriesRef.current[currentRow];
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
    }, [deleteEntry]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const rs = resizeState.current;
            if (!rs) return;
            const delta = e.clientX - rs.startX;
            const newWidth = Math.max(60, rs.startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [rs.field]: newWidth }));
        };

        const onMouseUp = () => {
            resizeState.current = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    function getColWidth(fieldName: string): number {
        return columnWidths[fieldName] ?? 150;
    }

    function handleHeaderClick(fieldName: string, shiftKey: boolean) {
        setSortConfig(prev => {
            const existingIdx = prev.findIndex(s => s.field === fieldName);

            if (!shiftKey) {
                if (existingIdx === -1) return [{ field: fieldName, direction: 'asc' }];
                if (prev[existingIdx].direction === 'asc') return [{ field: fieldName, direction: 'desc' }];
                return [];
            } else {
                if (existingIdx === -1) return [...prev, { field: fieldName, direction: 'asc' }];
                if (prev[existingIdx].direction === 'asc') {
                    return prev.map((s, i) =>
                        i === existingIdx ? { ...s, direction: 'desc' as SortDirection } : s
                    );
                }
                return prev.filter((_, i) => i !== existingIdx);
            }
        });
        setSelectedRow(-1);
    }

    function handleResizeMouseDown(e: React.MouseEvent, fieldName: string) {
        e.preventDefault();
        resizeState.current = {
            field: fieldName,
            startX: e.clientX,
            startWidth: getColWidth(fieldName),
        };
    }

    function handleToggleVisibleSelection() {
        if (visibleRowIds.length === 0) return;
        const nextSelection = new Set(selectedRowIds);
        if (allVisibleSelected) {
            visibleRowIds.forEach((rowId) => nextSelection.delete(rowId));
        } else {
            visibleRowIds.forEach((rowId) => nextSelection.add(rowId));
        }
        selectAll(Array.from(nextSelection));
    }

    function handleRowSelection(rowIndex: number, isShiftClick: boolean) {
        const row = sortedEntries[rowIndex];
        if (!row) return;

        if (isShiftClick && lastClickedIndexRef.current !== null) {
            const [start, end] = [Math.min(lastClickedIndexRef.current, rowIndex), Math.max(lastClickedIndexRef.current, rowIndex)];
            const rangeIds = sortedEntries.slice(start, end + 1).map((entry) => entry._id);
            const nextSelection = new Set(selectedRowIds);
            rangeIds.forEach((rowId) => nextSelection.add(rowId));
            selectAll(Array.from(nextSelection));
        } else {
            toggleRowSelection(row._id);
        }

        lastClickedIndexRef.current = rowIndex;
    }

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
                        onClick={() => { if (!isAddingEntry) setIsAddingEntry(true); }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold"
                        size="sm"
                        aria-label="Add new entry"
                    >
                        Add Entry (N)
                    </Button>
                </div>
                {pendingDeleteEntry && (
                    <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-none border-l-0 border-r-0 border-b-0">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span className="text-sm text-red-700 dark:text-red-300">
                                Delete this entry? Press{' '}
                                <kbd className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded font-mono text-xs border border-red-300 dark:border-red-700">Enter</kbd>
                                {' '}to confirm or{' '}
                                <kbd className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded font-mono text-xs border border-red-300 dark:border-red-700">Esc</kbd>
                                {' '}to cancel.
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        deleteEntry(pendingDeleteEntry._id);
                                        setSelectedRow(-1);
                                        setPendingDeleteEntry(null);
                                    }}
                                    variant="destructive"
                                    size="sm"
                                    className="text-zinc-900 dark:text-white"
                                >
                                    Delete
                                </Button>
                                <Button
                                    onClick={() => setPendingDeleteEntry(null)}
                                    variant="secondary"
                                    size="sm"
                                    className="text-zinc-900 dark:text-zinc-100"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
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
                        <div ref={headerScrollRef} style={{ overflowX: 'hidden', display: 'flex' }}>
                            <div role="row" style={{ display: 'flex' }}>
                                <div
                                    role="columnheader"
                                    aria-sort="none"
                                    style={{ width: 48, flexShrink: 0 }}
                                    className="px-2 py-3 flex items-center justify-center"
                                >
<Checkbox
                                        aria-label="Select All"
                                        checked={allVisibleSelected}
                                        aria-checked={isHeaderIndeterminate ? 'mixed' : allVisibleSelected}
                                        onCheckedChange={handleToggleVisibleSelection}
                                    />
                                </div>
                                {schema.fields.map((field) => {
                                    const sortInfo = sortConfig.find(s => s.field === field.name);
                                    const sortPriority = sortInfo ? sortConfig.indexOf(sortInfo) + 1 : 0;
                                    return (
                                        <div
                                            key={field.name}
                                            role="columnheader"
                                            aria-sort={sortInfo
                                                ? (sortInfo.direction === 'asc' ? 'ascending' : 'descending')
                                                : 'none'
                                            }
                                            onClick={(e) => handleHeaderClick(field.name, e.shiftKey)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleHeaderClick(field.name, e.shiftKey);
                                                }
                                            }}
                                            tabIndex={0}
                                            style={{ width: getColWidth(field.name), flexShrink: 0, position: 'relative', userSelect: 'none' }}
                                            className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap overflow-hidden cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none"
                                        >
                                            {field.name}
                                            <span className="ml-1 font-normal normal-case text-zinc-400 dark:text-zinc-500">
                                                ({field.type})
                                            </span>
                                            {sortInfo && (
                                                <span className="ml-1 text-emerald-500" aria-hidden="true">
                                                    {sortInfo.direction === 'asc' ? '▲' : '▼'}
                                                    {sortConfig.length > 1 && (
                                                        <sup className="text-[10px]">{sortPriority}</sup>
                                                    )}
                                                </span>
                                            )}
                                            <div
                                                onMouseDown={(e) => handleResizeMouseDown(e, field.name)}
                                                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize' }}
                                                aria-hidden="true"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable virtualizer body — scroll element for useVirtualizer; no role needed here */}
                    <div
                        ref={scrollContainerRef}
                        tabIndex={-1}
                        style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}
                        onScroll={() => {
                            if (headerScrollRef.current && scrollContainerRef.current) {
                                headerScrollRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
                            }
                        }}
                    >
                        {/* Inline add-entry row — rendered OUTSIDE the virtualizer loop */}
                        {isAddingEntry && (
                            <InlineEntryRow
                                schema={schema}
                                onCancel={() => {
                                    setIsAddingEntry(false);
                                    scrollContainerRef.current?.focus();
                                }}
                                onComplete={(id?: string) => {
                                    setIsAddingEntry(false);
                                    if (id) {
                                        setRecentlyCommittedId(id);
                                        setTimeout(() => setRecentlyCommittedId(null), 2000);
                                    }
                                }}
                            />
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
                            {virtualItems.map((virtualRow) => {
                                const entry = sortedEntries[virtualRow.index];
                                const isEditing = editingEntryId === entry._id;
                                const isHighlighted = highlightEntryId && entry._id === highlightEntryId;
                                const isSelected = selectedRow === virtualRow.index;
                                const isBulkSelected = selectedRowIds.has(entry._id);
                                const showBulkSelectionHighlight = isBulkSelected && selectedRowIds.size >= 2;

                                return (
                                    <div
                                        key={entry._id}
                                        role={isEditing ? undefined : "row"}
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
                                             : showBulkSelectionHighlight
                                                 ? 'selected-row'
                                             : isSelected
                                             ? 'bg-zinc-100 dark:bg-zinc-800'
                                             : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                         }`}
                                        onClick={(e) => {
                                            setSelectedRow(virtualRow.index);
                                            setSelectedEntryId(entry._id);
                                            setRightInspector(true);
                                            if (e.shiftKey && !isAddingEntry) {
                                                handleRowSelection(virtualRow.index, true);
                                            } else {
                                                lastClickedIndexRef.current = virtualRow.index;
                                            }
                                        }}
                                        onDoubleClick={() => setEditingEntryId(entry._id)}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setEditingEntryId(entry._id);
                                            } else if (e.key === ' ' && !isAddingEntry) {
                                                e.preventDefault();
                                                handleRowSelection(virtualRow.index, e.shiftKey);
                                            }
                                        }}
                                    >
                                        {isEditing ? (
                                            <>
                                                <div style={{ width: 48, flexShrink: 0 }} className="px-2 py-2" />
                                                <InlineEntryRow
                                                    schema={schema}
                                                    entry={entry}
                                                    onCancel={() => setEditingEntryId(null)}
                                                    onComplete={() => {
                                                        setEditingEntryId(null);
                                                        // Flash only fires for new entries (add mode), not edits
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    role="gridcell"
                                                    style={{ width: 48, flexShrink: 0 }}
                                                    className="px-2 py-2 flex items-center justify-center"
                                                >
                                                    <Checkbox
                                                        aria-label={`Select row ${virtualRow.index + 1}`}
                                                        checked={isBulkSelected}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRowSelection(virtualRow.index, e.shiftKey);
                                                        }}
                                                        onCheckedChange={() => undefined}
                                                    />
                                                </div>
                                                {schema.fields.map((field) => (
                                                    <div
                                                        key={`${entry._id}-${field.name}`}
                                                        role="gridcell"
                                                        tabIndex={0}
                                                        style={{ width: getColWidth(field.name), flexShrink: 0 }}
                                                        className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 overflow-hidden text-ellipsis whitespace-nowrap"
                                                        onKeyDown={(e) => {
                                                            if (e.key === ' ') {
                                                                if (isAddingEntry) return;
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleRowSelection(virtualRow.index, e.shiftKey);
                                                            }
                                                        }}
                                                    >
                                                        {renderFieldValue(entry.data[field.name], field.type, entry as FlattenedEntry, field, deletedEntryIds)}
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Split View for Back-links (Story 3-3, AC 4) */}
                {selectedEntry && (
                    <ScrollArea className="w-[300px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-y-auto">
                        <BackLinksPanel
                            targetEntryId={selectedEntry._id}
                            targetLedgerId={schemaId}
                        />
                    </ScrollArea>
                )}
            </div>
        </div>
    );
};

function renderFieldValue(value: unknown, type: string, entry?: FlattenedEntry, field?: SchemaField, deletedEntryIds?: Set<string>): React.ReactNode {
    if (value === null || value === undefined || value === '') {
        return <span className="text-zinc-400 dark:text-zinc-600 italic">-</span>;
    }

    switch (type) {
        case 'date':
            return new Date(value as string).toLocaleDateString();
        case 'number':
            return typeof value === 'number' ? value.toLocaleString() : String(value);
        case 'relation': {
            // Extract pre-resolved values from FlattenedEntry (AC #1, #4)
            const resolvedValues = entry?.resolvedRelations?.[field?.name ?? ''];

            // Backward-compat ghost detection via deletedEntryIds when no resolved values (Story 3-14)
            const values = Array.isArray(value) ? value as string[] : [value as string];
            const hasDeletedTarget = !resolvedValues && values.some(v => deletedEntryIds?.has(v));

            // Render as Tag Chip with navigation (Story 3-3)
            return (
                <RelationTagChip
                    value={value as string | string[]}
                    targetLedgerId={field?.relationTarget}
                    entryId={entry?._id}
                    isGhost={hasDeletedTarget}
                    resolvedValues={resolvedValues}
                />
            );
        }
        default:
            return String(value);
    }
}

