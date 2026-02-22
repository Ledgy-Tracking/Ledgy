import React, { useState, useEffect } from 'react';
import { useLedgerStore } from '../../stores/useLedgerStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LedgerSchema, LedgerEntry, SchemaField } from '../../types/ledger';
import { InlineEntryRow } from './InlineEntryRow';
import { RelationTagChip } from './RelationTagChip';

interface LedgerTableProps {
    schemaId: string;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({ schemaId }) => {
    const { schemas, entries, fetchEntries } = useLedgerStore();
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
                        className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
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
                {ledgerEntries.map((entry, index) => (
                    <div
                        key={entry._id}
                        className={`flex border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors ${
                            selectedRow === index ? 'bg-zinc-800/50' : ''
                        }`}
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
                                {renderFieldValue(entry.data[field.name], field.type, entry, field)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

function renderFieldValue(value: unknown, type: string, entry?: LedgerEntry, field?: SchemaField): React.ReactNode {
    if (value === null || value === undefined) {
        return <span className="text-zinc-600 italic">-</span>;
    }

    switch (type) {
        case 'date':
            return new Date(value as string).toLocaleDateString();
        case 'number':
            return typeof value === 'number' ? value.toLocaleString() : String(value);
        case 'relation':
            // Render as Tag Chip with navigation (Story 3-3)
            return (
                <RelationTagChip
                    value={value as string | string[]}
                    targetLedgerId={field?.relationTarget}
                    onClick={() => {
                        // TODO: Navigate to target ledger (Story 3-3)
                        console.log('Navigate to', field?.relationTarget);
                    }}
                />
            );
        default:
            return String(value);
    }
}
