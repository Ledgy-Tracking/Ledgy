import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LedgerEntry } from '../../types/ledger';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown } from 'lucide-react';

export const MAX_RESULTS = 50;

/**
 * Fuzzy-match `query` against `text`. Returns a score ≥ 0 on match, -1 on no match.
 * Tier 1 (highest): exact substring match → score = 100 + (text.length - query.length)
 * Tier 2: subsequence match → score = sum of consecutive-character run lengths
 * All comparisons are case-insensitive.
 */
export function fuzzyScore(text: string, query: string): number {
    if (query === '') return 0;
    const t = text.toLowerCase();
    const q = query.toLowerCase();

    // Tier 1: substring
    if (t.includes(q)) return 1000 - (t.length - q.length);

    // Tier 2: subsequence
    let score = 0;
    let consecutive = 0;
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            qi++;
            consecutive++;
            score += consecutive;
        } else {
            consecutive = 0;
        }
    }
    return qi === q.length ? score : -1;
}

interface RelationComboboxProps {
    entries: LedgerEntry[];
    value?: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    allowMultiple?: boolean;
    getDisplayValue?: (entry: LedgerEntry) => string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
    deletedEntryIds?: Set<string>;
}

/**
 * Combobox for selecting related entries.
 * Supports single or multiple selection with fuzzy search/filter.
 */
export const RelationCombobox = React.forwardRef<HTMLButtonElement, RelationComboboxProps>(({
    entries,
    value,
    onChange,
    placeholder = 'Select entry...',
    allowMultiple = false,
    getDisplayValue = (entry) => {
        const data = entry.data || {};
        const firstValue = Object.values(data)[0];
        return firstValue ? String(firstValue) : entry._id;
    },
    onKeyDown: externalKeyDown,
    deletedEntryIds = new Set(),
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    // Defer filter computation so rapid typing never blocks the search input
    const deferredSearchTerm = React.useDeferredValue(searchTerm);

    const { visibleEntries, totalCount } = (() => {
        if (!deferredSearchTerm) {
            return { visibleEntries: entries.slice(0, MAX_RESULTS), totalCount: entries.length };
        }
        const scored = entries
            .map(entry => ({ entry, score: fuzzyScore(getDisplayValue(entry), deferredSearchTerm) }))
            .filter(({ score }) => score >= 0)
            .sort((a, b) => b.score - a.score);
        return {
            visibleEntries: scored.slice(0, MAX_RESULTS).map(({ entry }) => entry),
            totalCount: scored.length,
        };
    })();
    const isOverflowing = totalCount > MAX_RESULTS;

    // Build trigger label from selected entry display values
    const selectedDisplay = (() => {
        if (selectedValues.length === 0) return null;
        // ⚡ Bolt: Replace chained .map().filter().map() with single-pass loop
        // Avoids O(S) intermediate array allocations and redundant iterations
        const names: string[] = [];
        for (let i = 0; i < selectedValues.length; i++) {
            const entry = entries.find(e => e._id === selectedValues[i]);
            if (entry) {
                names.push(getDisplayValue(entry));
            }
        }
        if (names.length === 0) return `${selectedValues.length} selected`;
        if (names.length <= 2) return names.join(', ');
        return `${names[0]} +${names.length - 1} more`;
    })();

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
                setHighlightedIndex((prev) => Math.min(prev + 1, visibleEntries.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && visibleEntries[highlightedIndex]) {
                    handleSelect(visibleEntries[highlightedIndex]._id);
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
            <Button
                ref={ref}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={!isOpen ? externalKeyDown : undefined}
                variant="outline"
                className="w-full justify-between gap-2 bg-transparent text-zinc-900 dark:text-zinc-100 hover:border-zinc-600 focus:ring-emerald-500"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="truncate">
                    {selectedDisplay ?? placeholder}
                </span>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <Card className="absolute z-50 w-full mt-1 bg-gray-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded shadow-lg max-h-60 overflow-hidden">
                    <CardContent>
                        {/* Search Input */}
                        <Input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setHighlightedIndex(-1);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    setIsOpen(false);
                                    setSearchTerm('');
                                    setHighlightedIndex(-1);
                                    // Forward Tab/Shift+Tab to parent row's field navigator.
                                    // Cast is safe: the handler only reads e.key and e.shiftKey, which exist
                                    // identically on both input and button KeyboardEvents. The double-cast
                                    // (to unknown then to HTMLButtonElement type) is intentional for type safety.
                                    externalKeyDown?.(e as unknown as React.KeyboardEvent<HTMLButtonElement>);
                                    return;
                                }
                                handleKeyDown(e);
                            }}
                            placeholder="Search entries..."
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            aria-autocomplete="list"
                        />

                        {/* Options List */}
                        <ul
                            role="listbox"
                            className="overflow-y-auto max-h-48"
                            aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
                        >
                            {visibleEntries.length === 0 ? (
                                <li className="px-3 py-2 text-sm text-zinc-500">No entries found</li>
                            ) : (
                                <>
                                    {visibleEntries.map((entry, index) => {
                                        const displayValue = getDisplayValue(entry);
                                        const isSelected = selectedValues.includes(entry._id);
                                        const isGhost = deletedEntryIds.has(entry._id);

                                        return (
                                            <li
                                                key={entry._id}
                                                id={`option-${index}`}
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => handleSelect(entry._id)}
                                                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                                                    index === highlightedIndex
                                                        ? isGhost ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-emerald-900/50'
                                                        : 'hover:bg-gray-200 dark:hover:bg-zinc-800'
                                                } ${isSelected ? 'bg-emerald-900/30' : ''}`}
                                            >
                                                <span className={`text-sm truncate flex-1 ${
                                                     isGhost ? 'text-zinc-500 line-through' : 'text-zinc-800 dark:text-zinc-200'
                                                 }`}>
                                                    {displayValue}
                                                </span>
                                                {isSelected && <Check size={14} className={`ml-2 ${
                                                     isGhost ? 'text-zinc-600' : 'text-emerald-500'
                                                 }`} />}
                                            </li>
                                        );
                                    })}
                                    {isOverflowing && (
                                        <li className="px-3 py-1.5 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 select-none">
                                            Showing {MAX_RESULTS} of {totalCount} — type to filter
                                        </li>
                                    )}
                                </>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
});

RelationCombobox.displayName = 'RelationCombobox';


