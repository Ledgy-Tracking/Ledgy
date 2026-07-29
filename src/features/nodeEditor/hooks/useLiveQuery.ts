import { useEffect, useCallback, useRef } from 'react';
import { getProfileDb } from '@/lib/db';
import { useProfileStore } from '@/stores/useProfileStore';
import { useErrorStore } from '@/stores/useErrorStore';
import { LedgerEntry } from '@/types/ledger';
import { REFRESH_DEBOUNCE_MS } from '../utils/nodeConstants';

/**
 * Subscribe to real-time changes for a specific ledger
 * Uses PouchDB changes feed with selector for efficient filtering
 * AC2: Real-Time Data Synchronization
 */
export const subscribeToLedgerChanges = (
  ledgerId: string,
  onChange: (_change: PouchDB.Core.ChangesResponseChange<{}>) => void
): (() => void) => {
  const activeProfileId = useProfileStore.getState().activeProfileId;
  if (!activeProfileId) {
    throw new Error('No active profile');
  }

  const db = getProfileDb(activeProfileId);

  const changes = db.changes({
    since: 'now',
    live: true,
    include_docs: true,
    selector: {
      type: 'entry',
      ledgerId: ledgerId,
      isDeleted: { $exists: false }  // Exclude ghost references
    }
  });

  changes.on('change', onChange);
  changes.on('error', (err) => {
    useErrorStore.getState().dispatchError(`Live sync error: ${err.message}`);
  });

  // Return unsubscribe function
  return () => changes.cancel();
};

/**
 * Hook for managing live query subscriptions with debounced updates
 */
export const useLiveQuery = (
  ledgerId: string | undefined,
  onDataChange: (entries: LedgerEntry[]) => void,
  cacheSize: number = 10
) => {
  const activeProfileId = useProfileStore.getState().activeProfileId;
  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Debounced data refresh
  const debouncedRefresh = useCallback(async () => {
    if (!ledgerId || !activeProfileId) return;

    try {
      const db = getProfileDb(activeProfileId);

      // Get latest entries for this ledger
      const allEntries = await db.getAllDocuments<LedgerEntry>('entry');
      const ledgerEntries = allEntries
        .filter(doc =>
          !doc.isDeleted &&
          doc.ledgerId === ledgerId
        )
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // descending
        })
        .slice(0, cacheSize);

      onDataChange(ledgerEntries);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh ledger data';
      useErrorStore.getState().dispatchError(message);
    }
  }, [ledgerId, activeProfileId, onDataChange, cacheSize]);

  // Handle change events with debouncing
  const handleChange = useCallback((_change: PouchDB.Core.ChangesResponseChange<{}>) => {
    // Debounce updates to batch rapid changes
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    refreshTimeout.current = setTimeout(() => {
      debouncedRefresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [debouncedRefresh]);

  // Subscribe on mount
  useEffect(() => {
    if (!ledgerId || !activeProfileId) return;

    // Subscribe to changes
    unsubscribeRef.current = subscribeToLedgerChanges(ledgerId, handleChange);

    // Initial data load
    debouncedRefresh();

    // Cleanup on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, [ledgerId, activeProfileId, handleChange, debouncedRefresh]);

  // Manual refresh function
  const refresh = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  return {
    refresh,
    isSubscribed: !!unsubscribeRef.current
  };
};