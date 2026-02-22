import React, { useState, useRef, useEffect } from 'react';
import { LedgerEntry } from '../../types/ledger';
import { Check, ChevronDown } from 'lucide-react';

interface RelationComboboxProps {
    entries: LedgerEntry[];
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    allowMultiple?: boolean;
    getDisplayValue?: (entry: LedgerEntry) => string;
}

/**
 * Combobox for selecting related entries.
 * Supports single or multiple selection with search/filter.
 */
export const RelationCombobox: React.FC<RelationComboboxProps> = ({
    entries,
    value,
    onChange,
    placeholder = 'Select entry...',
    allowMultiple = false,
    getDisplayValue = (entry) => {
        // Try to get a display value from the entry data
        const data = entry.data || {};
        const firstValue = Object.values(data)[0];
        return firstValue ? String(firstValue) : entry._id;
    },
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    // Filter entries based on search
    const filteredEntries = entries.filter((entry) => {
        const displayValue = getDisplayValue(entry);
        return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            inputRef.current?.focus();
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = (entryId: string) => {
        if (allowMultiple) {
            const newValues = selectedValues.includes(entryId)
                ? selectedValues.filter((v) => v !== entryId)
                : [...selectedValues, entryId];
            onChange(newValues);
        } else {
            onChange(entryId);
            setIsOpen(false);
        }
        setSearchTerm('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => Math.min(prev + 1, filteredEntries.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredEntries[highlightedIndex]) {
                    handleSelect(filteredEntries[highlightedIndex]._id);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1 bg-transparent border border-zinc-700 rounded text-sm text-zinc-100 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="truncate">
                    {selectedValues.length > 0
                        ? `${selectedValues.length} selected`
                        : placeholder}
                </span>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded shadow-lg max-h-60 overflow-hidden">
                    {/* Search Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search entries..."
                        className="w-full px-3 py-2 bg-zinc-800 border-b border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-autocomplete="list"
                    />

                    {/* Options List */}
                    <ul
                        role="listbox"
                        className="overflow-y-auto max-h-48"
                        aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
                    >
                        {filteredEntries.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-zinc-500">No entries found</li>
                        ) : (
                            filteredEntries.map((entry, index) => {
                                const displayValue = getDisplayValue(entry);
                                const isSelected = selectedValues.includes(entry._id);

                                return (
                                    <li
                                        key={entry._id}
                                        id={`option-${index}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(entry._id)}
                                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                                            index === highlightedIndex
                                                ? 'bg-emerald-900/50'
                                                : 'hover:bg-zinc-800'
                                        } ${isSelected ? 'bg-emerald-900/30' : ''}`}
                                    >
                                        <span className="text-sm text-zinc-200 truncate flex-1">
                                            {displayValue}
                                        </span>
                                        {isSelected && <Check size={14} className="text-emerald-500 ml-2" />}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
