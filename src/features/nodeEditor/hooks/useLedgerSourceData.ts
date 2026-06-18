import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useErrorStore } from '@/stores/useErrorStore';
import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { LedgerEntry } from '@/types/ledger';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { REFRESH_DEBOUNCE_MS, FRESH_DATA_INDICATOR_MS } from '../utils/nodeConstants';

export interface LedgerSourceStats {
    avg?: number;
    min?: number;
    max?: number;
    count: number;
}

export interface UseLedgerSourceDataReturn {
    entries: LedgerEntry[];
    stats: Record<string, LedgerSourceStats | null>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;
    isFresh: boolean;
}

/**
 * Hook for fetching and subscribing to ledger data
 * Story 4.5 - Real-time data preview with debounced updates
 */
export const useLedgerSourceData = (
    ledgerId: string | undefined,
    cacheSize: number = 10
): UseLedgerSourceDataReturn => {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isFresh, setIsFresh] = useState(false);

    const activeProfileId = useProfileStore(s => s.activeProfileId);
    const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const freshDataTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Calculate stats for number fields
    const stats = useMemo(() => {
        const result: Record<string, LedgerSourceStats | null> = {};
        
        if (entries.length === 0) return result;

        // Get all unique field IDs from entries
        const fieldIds = new Set<string>();
        entries.forEach(entry => {
            Object.keys(entry.data).forEach(fieldId => fieldIds.add(fieldId));
        });

        // Calculate stats for each field that contains numbers
        fieldIds.forEach(fieldId => {
            let min = Infinity;
            let max = -Infinity;
            let sum = 0;
            let count = 0;

            for (let i = 0; i < entries.length; i++) {
                const val = entries[i].data[fieldId];
                if (typeof val === 'number' && !Number.isNaN(val)) {
                    if (val < min) min = val;
                    if (val > max) max = val;
                    sum += val;
                    count++;
                }
            }

            if (count === 0) {
                result[fieldId] = null;
            } else {
                result[fieldId] = {
                    avg: sum / count,
                    min,
                    max,
                    count,
                };
            }
        });

        return result;
    }, [entries]);

    // Fetch entries from database
    const fetchEntries = useCallback(async () => {
        if (!ledgerId || !activeProfileId) {
            setEntries([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const authState = useAuthStore.getState();
            const db = getProfileDb(activeProfileId);

            // Get all entries for this ledger
            const allEntries = await db.getAllDocuments<LedgerEntry>('entry');
            const filteredEntries = allEntries
                .filter(doc => !doc.isDeleted && doc.ledgerId === ledgerId)
                .sort((a, b) => {
                    // Safely parse dates, treating invalid dates as epoch 0
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    // Handle NaN cases (invalid dates)
                    const timeA = isNaN(dateA) ? 0 : dateA;
                    const timeB = isNaN(dateB) ? 0 : dateB;
                    return timeB - timeA;
                })
                .slice(0, cacheSize);

            // Decrypt if needed
            const decryptedEntries = authState.encryptionKey && authState.isUnlocked
                ? await Promise.all(
                    filteredEntries.map(async entry => {
                        try {
                            const { decryptLedgerEntry } = await import('@/lib/db');
                            return await decryptLedgerEntry(entry, authState.encryptionKey!);
                        } catch {
                            return entry;
                        }
                    })
                )
                : filteredEntries;

            setEntries(decryptedEntries);
            setLastUpdated(new Date().toISOString());
            setError(null);

            // Trigger fresh data indicator
            setIsFresh(true);
            if (freshDataTimeout.current) {
                clearTimeout(freshDataTimeout.current);
            }
            freshDataTimeout.current = setTimeout(() => {
                setIsFresh(false);
            }, FRESH_DATA_INDICATOR_MS);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch ledger data';
            setError(message);
            useErrorStore.getState().dispatchError(message);
        } finally {
            setIsLoading(false);
        }
    }, [ledgerId, activeProfileId, cacheSize]);

    // Initial fetch
    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // Subscribe to changes
    useEffect(() => {
        if (!ledgerId || !activeProfileId) return;

        const abortController = new AbortController();
        const db = getProfileDb(activeProfileId);

        // Subscribe to changes feed
        const subscription = db.changes({
            since: 'now',
            live: true,
            include_docs: true,
        }).on('change', (change) => {
            if (abortController.signal.aborted) return;

            // Check if this change is relevant to our ledger
            const doc = change.doc as LedgerEntry | undefined;
            if (doc?.type === 'entry' && doc?.ledgerId === ledgerId) {
                // Debounced refresh
                if (refreshTimeout.current) {
                    clearTimeout(refreshTimeout.current);
                }
                refreshTimeout.current = setTimeout(() => {
                    if (!abortController.signal.aborted) {
                        fetchEntries();
                    }
                }, REFRESH_DEBOUNCE_MS);
            }
        }).on('error', (err) => {
            if (!abortController.signal.aborted) {
                const message = `Ledger subscription error: ${err.message}`;
                useErrorStore.getState().dispatchError(message);
            }
        });

        return () => {
            abortController.abort();
            subscription.cancel();
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
            }
            if (freshDataTimeout.current) {
                clearTimeout(freshDataTimeout.current);
            }
        };
    }, [ledgerId, activeProfileId, fetchEntries]);

    return { entries, stats, isLoading, error, lastUpdated, isFresh };
};

/**
 * Get field stats for number fields (convenience hook for single field)
 */
export const useFieldStats = (
    entries: LedgerEntry[],
    fieldId: string
): LedgerSourceStats | null => {
    return useMemo(() => {
        if (entries.length === 0) return null;
        
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let count = 0;

        for (let i = 0; i < entries.length; i++) {
            const val = entries[i].data[fieldId];
            if (typeof val === 'number' && !Number.isNaN(val)) {
                if (val < min) min = val;
                if (val > max) max = val;
                sum += val;
                count++;
            }
        }
        
        if (count === 0) return null;
        
        return {
            avg: sum / count,
            min,
            max,
            count,
        };
    }, [entries, fieldId]);
};
